import { registerMap } from 'echarts/core'
import ReactEcharts, { EChartsOption } from 'echarts-for-react'
import {
  GeoComponentOption,
} from 'echarts/components'
import geoJson from '@/public/countries.geo.json'
import { useTheme } from '@mui/system'
import { useEffect, useMemo, useRef } from 'react'
import { t } from '@lingui/core/macro'
import { Box, CircularProgress } from '@mui/material'

import { ECharts } from 'echarts'
import {
  AffiliationData,
  ChartOption,
  MapCollaborationsProps,
} from '@/app/[lang]/dashboard/components/CollaborationMap/CollaborationMapTypes'
import {
  useCountryPoints,
  useFilteredData, useHandleRoam,
  useMergedPoints,
} from '@/app/[lang]/dashboard/components/CollaborationMap/CollaborationMapHooks'
import { DocumentData } from '@/app/[lang]/dashboard/page'

const CollaborationMap = ({
  yearRange,
  data = [],
  loading = false,
}: MapCollaborationsProps) => {
  const theme = useTheme()

  const chartRef = useRef<ReactEcharts>(null)

  const map = JSON.stringify(geoJson)
  registerMap('world', map)

  const filteredData: AffiliationData[] = useFilteredData({
    data,
    yearRange,
  })

  const countryPoints = useCountryPoints(filteredData)

  const mergedPoints = useMergedPoints(countryPoints)

  const mergedFnRef = useRef(mergedPoints)

  useEffect(() => {
    mergedFnRef.current = mergedPoints
  }, [mergedPoints])

  const handleRoam = useHandleRoam(chartRef,mergedFnRef)

  /**
   * Attach event handler for user map interaction
   */
  const onEvents = useMemo(
    () => ({
      georoam: () => {
        handleRoam()
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
          data: [],
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
                Record<string, Record<string, DocumentData>>,
              ]
              let html = `<div style="margin:0; padding: 0"><ul style="padding:0; margin: 0">`
              const orgs = Object.entries(item[3])
              orgs.some((org, index) => {
                //stop iteration after reaching 5th element of list and display number of remaining organization
                if (index == 4) {
                  html += `<p>${t`map_collaborations_tooltip_remaining_orgs` + (orgs.length - index)}</p>`
                  return true
                }
                const name = org[0]
                const documents = Object.entries(org[1])
                html += `<li>${name}<ul style="padding:0 0 0 15px; margin: 6px 0 0 0"><li style="margin: 0 0 3px 0"><a>${documents.length}${t`map_collaborations_tooltip_nb_documents_per_org`}</a></li></ul></li>`
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
