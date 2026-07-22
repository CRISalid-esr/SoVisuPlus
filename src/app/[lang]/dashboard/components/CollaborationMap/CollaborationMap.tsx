import { registerMap } from 'echarts/core'
import ReactEcharts from 'echarts-for-react'
import geoJson from '@/public/countries.geo.json'
import { useTheme } from '@mui/system'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { plural, t } from '@lingui/core/macro'
import { alpha, Box, CircularProgress } from '@mui/material'

import { ECElementEvent, ECharts } from 'echarts'
import {
  AffiliationData,
  ChartOption,
  EChartsEventHandler,
  MapCollaborationsProps,
} from '@/app/[lang]/dashboard/components/CollaborationMap/CollaborationMapTypes'
import {
  useCountryPoints,
  useFilteredData,
  useHandleRoam,
  useMergedPoints,
} from '@/app/[lang]/dashboard/components/CollaborationMap/CollaborationMapHooks'
import { DashboardDocumentData } from '@/types/DashboardDocumentData'
import * as Lingui from '@lingui/core'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { useSearchParams } from 'next/navigation'

registerMap('world', JSON.stringify(geoJson))

const CollaborationMap = ({
  yearRange,
  data = [],
  loading = false,
  perimeterUids = [],
}: MapCollaborationsProps) => {
  const theme = useTheme()
  const lang = Lingui.i18n.locale as ExtendedLanguageCode
  const searchParams = useSearchParams()

  const chartRef = useRef<ReactEcharts>(null)
  const lockedPointRef = useRef<number[] | null>(null)
  // The ready echarts instance. echarts-for-react mounts asynchronously (it
  // first measures the container with a temporary, option-less instance), so
  // effects must not grab the instance through the ref at mount time — they
  // key on this state instead, set once `onChartReady` delivers the real
  // instance.
  const [chartInstance, setChartInstance] = useState<ECharts | null>(null)

  const filteredData: AffiliationData[] = useFilteredData({
    data,
    yearRange,
    perimeterUids,
  })

  const [countryPoints, countryCenters] = useCountryPoints(filteredData)

  const mergedPoints = useMergedPoints(countryPoints)

  const mergedFnRef = useRef(mergedPoints)

  useEffect(() => {
    mergedFnRef.current = mergedPoints
  }, [mergedPoints])

  const handleRoam = useHandleRoam(chartRef, mergedFnRef)

  /**
   * Attach event handler for user map interaction
   */
  const onEvents: Record<string, EChartsEventHandler> = useMemo(
    () => ({
      georoam: () => {
        handleRoam()
      },
    }),
    [handleRoam],
  )

  /**
   * Smoothly zoom about a chart-space point by replaying real mouse-wheel
   * events — the same RoamController path scrolling uses, so the geo base and
   * the scatter stay in sync (no shift) and the merged points are recomputed
   * through the existing `georoam` -> `handleRoam` wiring. The ticks are spread
   * evenly over a short duration so the zoom glides. Each tick is echarts'
   * smallest step (factor 1.1, reached when the normalised |deltaY| <= 40);
   * wheel up (negative deltaY) zooms in.
   *
   * Dispatching the public `geoRoam` action instead does NOT work: its
   * `updateTransform` pipeline deliberately re-renders only series ("Geo
   * render cost a lot" — echarts core), so the scatter moves while the geo
   * base keeps its stale transform. The base only moves in sync because the
   * internal RoamController pre-applies the transform to MapDraw's private
   * group before dispatching, which is unreachable from the public API —
   * synthetic wheel events are the only public entry point exercising both.
   */
  const smoothZoom = useCallback(
    (
      originX: number,
      originY: number,
      totalTicks: number,
      out: boolean,
      interval = 45, // ms between ticks (lower = faster glide)
    ) => {
      const map = chartRef.current?.getEchartsInstance() as ECharts | undefined
      if (!map) return
      const dom = map.getDom() as HTMLElement
      const target = (dom.querySelector('canvas') as HTMLElement | null) ?? dom
      const rect = target.getBoundingClientRect()
      const deltaY = out ? 30 : -30
      const fireWheel = () =>
        target.dispatchEvent(
          new WheelEvent('wheel', {
            deltaY,
            clientX: rect.left + originX,
            clientY: rect.top + originY,
            bubbles: true,
            cancelable: true,
          }),
        )

      const start = performance.now()
      let fired = 0
      let nextAt = 0
      const step = (now: number) => {
        const elapsed = now - start
        while (fired < totalTicks && elapsed >= nextAt) {
          fireWheel()
          fired += 1
          nextAt += interval
        }
        if (fired < totalTicks) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    },
    [],
  )

  /**
   * Recompute the merged points at the map's current zoom and push them into
   * the scatter series. Single population path shared by the initial render
   * and data changes.
   */
  const populatePoints = useCallback((map: ECharts) => {
    // A bare or disposed instance has no option to read — nothing to populate.
    const option = map.getOption() as { geo?: { zoom?: number }[] } | undefined
    if (!option) return
    const zoom = option.geo?.[0]?.zoom || 1
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
  }, [])

  /**
   * Populate the scatter series once the first frame has been rendered — only
   * then has the geo layout been computed, so points can be clustered through
   * `convertToPixel`.
   * @param map the echarts component rendering the datavizualisation
   */
  const onChartReady = (map: ECharts) => {
    const populateWhenReady = () => {
      map.off('finished', populateWhenReady)
      // `finished` is emitted synchronously from inside echarts' update cycle,
      // where `setOption` is rejected outright. Deferring lets that stack
      // unwind first; the layout is already built, so nothing is being raced.
      queueMicrotask(() => populatePoints(map))
    }
    map.on('finished', populateWhenReady)
    setChartInstance(map)
  }

  useEffect(() => {
    if (!chartInstance) return
    populatePoints(chartInstance)
  }, [countryPoints, chartInstance, populatePoints])

  useEffect(() => {
    const chart = chartInstance
    if (!chart) return
    const handleClick = (params: ECElementEvent) => {
      if (params.seriesType === 'scatter') {
        const mouseEvent = params.event?.event as MouseEvent
        lockedPointRef.current = [mouseEvent.offsetX, mouseEvent.offsetY]

        chart.dispatchAction({
          type: 'showTip',
          seriesIndex: params.seriesIndex,
          dataIndex: params.dataIndex,
        })

        return
      }

      if (params.componentType === 'geo') {
        const countryName = params.name
        const center = countryCenters[countryName]?.geometry.coordinates

        if (!center) {
          return
        }

        // Smoothly zoom in towards the clicked country using the same
        // `geoRoam` path as the toolbox buttons (geo base and points stay in
        // sync, no shift). Aim for ~zoom 4: derive how many 1.1 ticks reach it
        // from the current zoom, and zoom about the country's on-screen
        // position.
        const instance = chartRef.current?.getEchartsInstance() as
          | ECharts
          | undefined
        if (!instance) return
        const px = instance.convertToPixel(
          { geoIndex: 0 },
          center as number[],
        ) as number[] | undefined
        if (!px) return
        const currentZoom =
          (instance.getOption() as { geo?: { zoom?: number }[] }).geo?.[0]
            ?.zoom || 1
        const factor = 4 / currentZoom
        const ticks = Math.max(
          1,
          Math.round(Math.abs(Math.log(factor)) / Math.log(1.1)),
        )
        smoothZoom(px[0], px[1], ticks, factor < 1, 30)

        return
      }
    }
    const handleDocumentClick = (e: MouseEvent) => {
      const chartDom = chart.getDom()
      if (chartDom && !chartDom.contains(e.target as Node)) {
        lockedPointRef.current = null
        chart.dispatchAction({
          type: 'hideTip',
        })
      }
    }
    document.addEventListener('click', handleDocumentClick)
    chart.on('click', handleClick)
    return () => {
      document.removeEventListener('click', handleDocumentClick)
      chart.off('click', handleClick)
    }
  }, [chartInstance, countryCenters, smoothZoom])
  /**
   * Zoom in or out action perform by custom toolbox zoom buttons.
   * Zooms about the centre of the map over 6 wheel ticks.
   * @param out boolean telling whether it must perform zoom out instead of in
   */
  const zoomInOut = (out: boolean) => {
    const map = chartRef.current?.getEchartsInstance() as ECharts | undefined
    if (!map) return
    smoothZoom(map.getWidth() / 2, map.getHeight() / 2, 6, out, 35)
  }

  const navigateToDetailsPage = useCallback(
    (structures: { uid: string; name: string }[]): string => {
      const encodedStructures = JSON.stringify(
        structures.map((structure) => ({
          uid: encodeURIComponent(structure.uid),
          name: encodeURIComponent(structure.name),
        })),
      )
      const years = yearRange.join(',')
      const params = new URLSearchParams(searchParams.toString())
      params.set('structures', encodedStructures)
      params.set('years', years)
      return `/${lang}/documents?${params.toString()}`
    },
    [lang, searchParams, yearRange],
  )

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
        tooltip: {
          show: false,
        },
      },
      tooltip: {
        show: true,
        trigger: 'item',
        triggerOn: 'mousemove|click',
        enterable: true,
        //transitionDuration: 0.1,
        //hideDelay: 100,
        position: function (point, params, dom, rect, size) {
          if (lockedPointRef.current) {
            return lockedPointRef.current
          }
          return point
        },
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
                Record<
                  string,
                  { name: string; documents: Record<string, DashboardDocumentData> }
                >,
              ]
              let html = `<div style="margin:0; padding: 0"><ul style="padding:0; margin: 0">`
              const orgs = Object.entries(item[3])
              orgs.some((org, index) => {
                //stop iteration after reaching 5th element of list and display number of remaining organization
                if (index == 4) {
                  const remainingDocs: Record<string, DashboardDocumentData> = {}
                  for (let i = index; i < orgs.length; i++) {
                    const orgDocs = orgs[i][1].documents
                    Object.entries(orgDocs).forEach(
                      ([uid, doc]) => (remainingDocs[uid] ??= doc),
                    )
                  }
                  const nbRemainingDocs = Object.entries(remainingDocs).length
                  const nbRemainingOrgs = orgs.length - index
                  const remainingOrgsUidName: { uid: string; name: string }[] =
                    []
                  for (let i = index; i < orgs.length; i++) {
                    remainingOrgsUidName.push({
                      uid: orgs[i][0],
                      name: orgs[i][1].name,
                    })
                  }
                  html += `<p>${t`map_collaborations_tooltip_remaining_orgs ${nbRemainingOrgs}`}</p><a href=${navigateToDetailsPage(remainingOrgsUidName)} style="text-decoration: none">${plural(nbRemainingDocs, { one: `${nbRemainingDocs} map_collaborations_tooltip_nb_documents_remaining_single`, other: `${nbRemainingDocs} map_collaborations_tooltip_nb_documents_remaining_multiple` })}</a>`
                  return true
                }
                const uid = org[0]
                const name = org[1].name
                const documents = Object.entries(org[1].documents)
                const nbDocs = documents.length
                html += `<li>${name}<ul style="padding:0 0 0 15px; margin: 6px 0 0 0"><li style="margin: 0 0 3px 0"><a href=${navigateToDetailsPage([{ uid: uid, name: name }])} style="text-decoration: none">${plural(nbDocs, { one: `${nbDocs} map_collaborations_tooltip_nb_documents_per_org_single`, other: `${nbDocs} map_collaborations_tooltip_nb_documents_per_org_multiple` })}</a></li></ul></li>`
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
    [
      navigateToDetailsPage,
      theme.palette.primary.dark,
      theme.palette.primary.light,
      theme.palette.primary.main,
    ],
  )

  // The chart stays mounted while data loads: unmounting it would destroy the
  // echarts instance, resetting the user's zoom/pan and re-running the initial
  // layout race on every fetch. The spinner is overlaid instead.
  return (
    <Box sx={{ position: 'relative', minHeight: '600px' }}>
      <ReactEcharts
        onChartReady={onChartReady}
        onEvents={onEvents}
        option={option}
        lazyUpdate={true}
        ref={chartRef}
        style={{ height: '600px' }}
      />
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: alpha(theme.palette.background.default, 0.6),
            zIndex: 1,
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </Box>
  )
}
export default CollaborationMap
