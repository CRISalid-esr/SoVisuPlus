import { ComposeOption, registerMap } from 'echarts/core'
import ReactEcharts, { EChartsOption } from 'echarts-for-react'
import {
  GeoComponentOption,
  ToolboxComponentOption,
  TooltipComponentOption,
} from 'echarts/components'
import geoJson from 'public/countries.geo.json'
import { ScatterSeriesOption } from 'echarts/charts'
import { useTheme } from '@mui/system'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { t } from '@lingui/core/macro'
import { Box, CircularProgress } from '@mui/material'
import { OAStatus } from '@prisma/client'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { Feature, MultiPolygon, Polygon } from 'geojson'
import { debounce } from 'lodash'
import { ECharts } from 'echarts'
import useStore from '@/stores/global_store'

type ChartOption = ComposeOption<
  | GeoComponentOption
  | ScatterSeriesOption
  | ToolboxComponentOption
  | TooltipComponentOption
>

type AffiliationData = {
  longitude: number
  latitude: number
  name: string
  persons: Record<string, string | null>
}

type Point = {
  longitude: number
  latitude: number
  count: number
  data: Record<string, Record<string, string | null>>
}

const BASE_GRID_SIZE = 60
const ZOOM_THRESHOLD = 0.8

type MapCollaborationsProps = {
  yearRange: [number, number]
  loading: boolean
  data: Record<
    number,
    {
      uid: string
      oaStatus: OAStatus | null
      publicationDate: string | null
      upwOAStatus: OAStatus | null
      contributions: {
        person: {
          uid: string
          displayName: string | null
        }
        affiliations: {
          uid: string
          displayNames: string[]
          places: {
            latitude: number
            longitude: number
          }[]
        }[]
      }[]
    }[]
  >
}

const CollaborationMap = ({
  yearRange,
  data = [],
  loading = false,
}: MapCollaborationsProps) => {
  const theme = useTheme()
  const { currentPerspective } = useStore((state) => state.user)
  const chartRef = useRef<ReactEcharts>(null)
  const zoomRef = useRef<number>(1.15)
  const map = JSON.stringify(geoJson)
  registerMap('world', map)

  /**
   * Selects data in year range passing in props and flatten result in array
   * Return array of type { longitude :number, latitude : number, name :string, persons : Record <string, {firstName :string | null, lastName :string | null}>}[]
   * with longitude and latitude : coordinates of organization,
   * name : name of organization,
   * persons : set of collaborators in the organization record by their uid
   */
  const filteredData: AffiliationData[] = useMemo(() => {
    const processedData = Object.entries(data).reduce<
      Record<string, AffiliationData>
    >((acc, [year, docs]) => {
      if (Number(year) >= yearRange[0] && Number(year) <= yearRange[1]) {
        docs.map((doc) => {
          doc.contributions.map((contribution) => {
            const contributor = contribution.person
            if (!(contributor.uid == currentPerspective?.uid)) {
              contribution.affiliations.map((affiliation) => {
                if (
                  affiliation.places.length > 0 &&
                  affiliation.displayNames.length > 0
                ) {
                  acc[affiliation.uid] ??= {
                    longitude: affiliation.places[0].longitude,
                    latitude: affiliation.places[0].latitude,
                    name: affiliation.displayNames[0],
                    persons: {},
                  }
                  acc[affiliation.uid].persons[contributor.uid] ??=
                    contributor.displayName
                }
              })
            }
          })
        })
      }
      return acc
    }, {})
    return Object.entries(processedData).map(([key, value]) => value)
  }, [data, yearRange, currentPerspective])

  /**
   * Process filtered data to group organization by country on the map
   * Return set of data indexed by country id from geoJson object
   */
  const countryPoints = useMemo(() => {
    return geoJson.features.reduce<Record<string, AffiliationData[]>>(
      (acc, feature) => {
        const country:
          | Polygon
          | MultiPolygon
          | Feature<Polygon | MultiPolygon> = feature.geometry as
          | Polygon
          | MultiPolygon
          | Feature<Polygon | MultiPolygon>
        acc[feature.id] = filteredData.filter((data) => {
          const point: { type: 'Point'; coordinates: number[] } = {
            type: 'Point',
            coordinates: [data.longitude, data.latitude],
          }
          return booleanPointInPolygon(point, country)
        })
        return acc
      },
      {},
    )
  }, [filteredData])

  /**
   * Process points by country to merge ones that are closed depending on map zoom
   */
  const mergedPoints = useCallback(
    (map: ECharts, zoom?: number): Point[] => {
      const gridSize = Math.max(
        8,
        Math.min(80, BASE_GRID_SIZE / Math.pow(zoom ? zoom : 1, 0.6)),
      )
      return Object.entries(countryPoints)
        .map(([countryId, points]) => {
          const grid: Record<
            string,
            {
              coordinates: [number, number]
              count: number
              data: Record<string, Record<string, string | null>>
            }
          > = {}
          points.forEach((point) => {
            const px = map.convertToPixel({ geoIndex: 0 }, [
              point.longitude,
              point.latitude,
            ])
            if (!px) return
            const [x, y] = px
            const keyX = Math.floor(x / gridSize)
            const keyY = Math.floor(y / gridSize)
            const key = `${keyX}-${keyY}`

            if (!grid[key]) {
              grid[key] = { coordinates: [x, y], count: 1, data: {} }
            } else {
              grid[key].coordinates[0] += x
              grid[key].coordinates[1] += y
              grid[key].count += 1
            }
            grid[key].data[point.name] = point.persons
          })
          return Object.entries(grid)
            .map(([key, value]) => {
              const longitude = value.coordinates[0] / value.count
              const latitude = value.coordinates[1] / value.count
              const convert = map.convertFromPixel({ geoIndex: 0 }, [
                longitude,
                latitude,
              ])
              return {
                longitude: convert[0],
                latitude: convert[1],
                count: value.count,
                data: value.data,
              }
            })
            .flat()
        })
        .flat()
    },
    [countryPoints],
  )

  const mergedFnRef = useRef(mergedPoints)

  useEffect(() => {
    mergedFnRef.current = mergedPoints
  }, [mergedPoints])

  /**
   * Debounce update of merged points on zoom changes
   */
  const handleRoam = useMemo(
    () =>
      debounce((params) => {
        const map = chartRef.current?.getEchartsInstance() as EChartsOption & {
          geo?: GeoComponentOption
        }
        if (!map) return
        map.resize()
        const zoom = map?.getOption()?.geo?.[0]?.zoom || 1
        if (
          zoomRef.current === zoom ||
          Math.abs(zoom - zoomRef.current) < ZOOM_THRESHOLD
        )
          return
        zoomRef.current = zoom
        const points = mergedFnRef.current(map, zoom)
        map.setOption({
          series: [
            {
              id: 'collaborations',
              data: points.map((point) => [
                point.longitude,
                point.latitude,
                point.count,
                point.data,
              ]),
            },
          ],
        })
      }, 150),
    [],
  )

  /**
   * Attach event handler for user map interaction
   */
  const onEvents = useMemo(
    () => ({
      georoam: (params: never) => {
        handleRoam(params)
      },
    }),
    [handleRoam],
  )

  /**
   * Update map on rendering
   * @param map the echarts component rendering the datavizualisation
   */
  const onChartReady = (map: ECharts) => {
    requestAnimationFrame(() => {
      const points = mergedFnRef.current(map, 1.15)
      map.setOption({
        series: [
          {
            id: 'collaborations',
            data: points.map((point) => [
              point.longitude,
              point.latitude,
              point.count,
              point.data,
            ]),
          },
        ],
      })
    })
  }

  useEffect(() => {
    const map = chartRef.current?.getEchartsInstance() as EChartsOption & {
      geo?: GeoComponentOption
    }
    if (!map) return

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const zoom = map.getOption()?.geo?.[0]?.zoom || 1

        const points = mergedFnRef.current(map, zoom)

        map.setOption({
          series: [
            {
              id: 'collaborations',
              data: points.map((p) => [
                p.longitude,
                p.latitude,
                p.count,
                p.data,
              ]),
            },
          ],
        })
      })
    })
  }, [countryPoints])

  /**
   * Zoom in or out action perform by custom toolbox zoom buttons
   * @param out boolean telling whether it must perform zoom out instead of in
   */
  const zoomInOut = (out: boolean) => {
    const map = chartRef.current?.getEchartsInstance() as EChartsOption & {
      geo?: GeoComponentOption
    }
    if (map) {
      const geo = map.getOption().geo?.[0]
      if (geo) {
        const scale = out ? 0.8 : 1.2
        const newZoom = (geo.zoom || 1) * scale
        map.setOption({
          geo: [{ zoom: newZoom }],
        })
      }
    }
  }

  const option: ChartOption = useMemo(
    () => ({
      geo: {
        map: 'world',
        roam: true,
        zoom: 1.15,
        center: ['50%', '58%'],
        scaleLimit: {
          min: 1,
          max: 100,
        },
        left: '10%',
        top: '0%',
        bottom: '0%',
        right: '10%',
        preserveAspect: true,
      },
      tooltip: {
        show: false,
      },
      toolbox: {
        feature: {
          myZoomIn: {
            show: true,
            title: 'Zoom In',
            icon: `path://M21.974 23.827l-8.34-8.34q-.993.795-2.283 1.258t-2.747.463q-3.607 0-6.105-2.498T0 8.604 2.499 2.5 8.604 0t6.106 2.499 2.498 6.105q0 1.456-.463 2.747t-1.258 2.283l8.34 8.34zM8.604 14.56q2.482 0 4.22-1.737t1.737-4.22-1.737-4.22-4.22-1.737-4.22 1.738-1.737 4.22 1.738 4.219 4.22 1.737M7.28 12.575V9.928H4.633V7.28H7.28V4.633h2.648V7.28h2.647v2.648H9.928v2.647z`,
            onclick: () => {
              zoomInOut(false)
            },
          },
          myZoomOut: {
            show: true,
            title: 'Zoom Out',
            icon: `path://M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400ZM280-540v-80h200v80H280Z`,
            onclick: () => {
              zoomInOut(true)
            },
          },
          saveAsImage: {
            type: 'png',
            name: t`dashboard_page_map_title`,
            show: true,
          },
          iconStyle: {
            color: '#404040',
          },
        },
      },
      series: [
        {
          id: 'collaborations',
          type: 'scatter',
          coordinateSystem: 'geo',
          geoIndex: 0,
          encode: {
            tooltip: 2,
            label: 2,
          },
          data: [], //mergedPoints(1.15).map((point)=> [point.longitude,point.latitude,point.count]),
          symbolSize: (point: number[]) => {
            const count = point[2] || 1
            return Math.min(11 + Math.log(count) * 10, 50)
          },
          label: {
            show: true,
            formatter: (params) => {
              const count = Array.isArray(params.value) ? params.value[2] : 1
              return count as string
            },
            color: theme.palette.primary.light,
            fontWeight: 'bold',
          },
          itemStyle: {
            color: theme.palette.primary.dark,
            borderWidth: 1,
            borderColor: theme.palette.primary.main,
          },
          tooltip: {
            show: true,
            padding: [18, 30],
            textStyle: {
              lineHeight: 14,
            },
            extraCssText: `
            max-width: 300px;
            white-space: normal;
            word-break: break-word;
          `,
            formatter: (params) => {
              const item = params.data as [
                number,
                number,
                number,
                Record<string, Record<string, string>>,
              ]
              let html = `<div style="margin:0; padding: 0"><ul style="padding:0; margin: 0">`
              const orgs = Object.entries(item[3])
              const expandedDisplay = orgs.length < 5
              orgs.some((org, index) => {
                //stop iteration after reaching 5th element of list and display number of remaining organization
                if (index == 4) {
                  html += `<p>${t`map_collaborations_tooltip_remaining_orgs` + (orgs.length - index)}</p>`
                  return true
                }
                const name = org[0]
                html += `<li>${name}`
                if (expandedDisplay) {
                  html += `<ul style="padding:0 0 0 20px; margin: 6px 0 0 0">`
                  const persons = Object.entries(org[1])
                  let noName = 0
                  let hasName = 0
                  persons.forEach((person, index) => {
                    const name = person[1]
                    if (name) {
                      if (hasName < 5) {
                        html += `<li style="margin: 0 0 3px 0">${name}</li>`
                      }
                      hasName += 1
                    } else {
                      noName += 1
                    }
                  })
                  if (noName > 0) {
                    html += `<li style="margin: 0 0 3px 0">${t`map_collaborations_tooltip_unknown_contributors` + noName}</li>`
                  }
                  if (hasName > 4) {
                    const remainingPersons = persons.length - 4 - noName
                    html += `<li style="margin: 0 0 3px 0">${t`map_collaborations_tooltip_other_contributors` + remainingPersons}</li>`
                  }
                  html += `</ul>`
                }
                html += `</li>`
                if (index !== orgs.length - 1) html += `</br>`
                return false
              })
              html += `</ul></div>`
              return html
            },
          },
          animation: false,
        },
      ],
      lazyUpdate: true,
    }),
    [theme],
  )

  return (
    <Box>
      {loading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <ReactEcharts
          onChartReady={onChartReady}
          onEvents={onEvents}
          option={option}
          lazyUpdate={true}
          ref={chartRef}
          style={{ height: '600px' }}
        />
      )}
    </Box>
  )
}
export default CollaborationMap
