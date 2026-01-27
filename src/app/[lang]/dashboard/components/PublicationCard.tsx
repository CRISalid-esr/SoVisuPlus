import {
  Box,
  CircularProgress,
  MenuItem,
  Select,
  Typography,
} from '@mui/material'
import { t } from '@lingui/core/macro'
import ReactEcharts from 'echarts-for-react'
import { ComposeOption } from 'echarts/core'
import { BarSeriesOption } from 'echarts/charts'
import {
  DatasetComponentOption,
  GridComponentOption,
  TitleComponentOption,
  ToolboxComponentOption,
  TooltipComponentOption,
} from 'echarts/components'
import useStore from '@/stores/global_store'
import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import BlockIcon from '@mui/icons-material/Block'
import { OAStatus } from '@prisma/client'
import { OAStatusProperties } from '@/app/[lang]/documents/components/OAStatusProperties'

type ChartOption = ComposeOption<
  | BarSeriesOption
  | TitleComponentOption
  | TooltipComponentOption
  | GridComponentOption
  | DatasetComponentOption
  | ToolboxComponentOption
>

const PublicationCard = () => {
  const { currentPerspective } = useStore((state) => state.user)
  const [data, setData] = useState<
    Record<
      number,
      {
        uid: string
        oaStatus: OAStatus | null
        publicationDate: string | null
        upwOAStatus: OAStatus | null
      }[]
    >
  >([])
  const [loading, setLoading] = useState(false)

  const oldestYear = useMemo(() => {
    const years = Object.keys(data)
      .map(Number)
      .filter((year) => !Number.isNaN(year))
    if (years.length == 0) return null
    return Math.min(...years)
  }, [data])

  const currentYear = useMemo(() => dayjs().year(), [])

  const [yearRange, setYearRange] = useState({
    start: currentYear,
    end: currentYear,
  })

  const filteredData = useMemo(() => {
    setLoading(true)
    const processedData = Object.entries(data)
      .map(([year, docs]) => {
        if (Number(year) >= yearRange.start && Number(year) <= yearRange.end) {
          return {
            year: Number(year),
            total: docs.length,
            oa: docs.filter(
              (doc) =>
                (doc.upwOAStatus && doc.upwOAStatus !== OAStatus.CLOSED) ||
                (doc.oaStatus && doc.oaStatus !== OAStatus.CLOSED),
            ).length,
            unknown: docs.filter((doc) => !doc.upwOAStatus && !doc.oaStatus)
              .length,
            details: {
              'HAL open access': {
                value: docs.filter((doc) => doc.oaStatus == OAStatus.GREEN)
                  .length,
                color: OAStatusProperties[OAStatus.GREEN].color,
              },
              'Unpaywall Diamond': {
                value: docs.filter((doc) => doc.upwOAStatus == OAStatus.DIAMOND)
                  .length,
                color: OAStatusProperties[OAStatus.DIAMOND].color,
              },
              'Unpaywall Gold': {
                value: docs.filter((doc) => doc.upwOAStatus == OAStatus.GOLD)
                  .length,
                color: OAStatusProperties[OAStatus.GOLD].color,
              },
              'Unpaywall Green': {
                value: docs.filter((doc) => doc.upwOAStatus == OAStatus.GREEN)
                  .length,
                color: OAStatusProperties[OAStatus.GREEN].color,
              },
              'Unpaywall Bronze': {
                value: docs.filter((doc) => doc.upwOAStatus == OAStatus.BRONZE)
                  .length,
                color: OAStatusProperties[OAStatus.BRONZE].color,
              },
              'Unpaywall Hybrid': {
                value: docs.filter((doc) => doc.upwOAStatus == OAStatus.HYBRID)
                  .length,
                color: OAStatusProperties[OAStatus.HYBRID].color,
              },
              'Unpaywall Other': {
                value: docs.filter((doc) => doc.upwOAStatus == OAStatus.OTHER)
                  .length,
                color: OAStatusProperties[OAStatus.OTHER].color,
              },
            },
          }
        }
      })
      .filter((value) => value !== undefined)
    setLoading(false)
    return processedData
  }, [data, yearRange])

  useEffect(() => {
    const contributorUid = currentPerspective?.uid
    const contributorType = currentPerspective?.type
    if (!contributorType || !contributorUid) return
    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await fetch(
          `/api/documents/dataviz?contributorUid=${contributorUid}&contributorType=${contributorType}`,
        )
        if (!response.ok) {
          throw new Error('Failed to fetch documents per year')
        }
        const res = await response.json()
        const documents: Record<
          number,
          {
            uid: string
            oaStatus: OAStatus | null
            publicationDate: string | null
            upwOAStatus: OAStatus | null
          }[]
        > = res.documents
        const years = Object.keys(documents)
          .map(Number)
          .filter((year) => !Number.isNaN(year))
        const oldestYear = years.length == 0 ? null : Math.min(...years)
        setYearRange({
          start: oldestYear
            ? oldestYear <= currentYear - 5
              ? currentYear - 5
              : oldestYear
            : currentYear,
          end: currentYear,
        })
        setData(documents)
      } catch (error) {
        console.error('Error while fetching documents per year', error)
        setLoading(false)
      }
    }
    fetchData()
  }, [currentPerspective, currentYear])

  const option = useMemo<ChartOption | null>(() => {
    if (filteredData.length == 0) return null
    return {
      title: {
        text: t`dashboard_page_publication_by_year_graph_title`,
        left: 'center',
      },
      toolbox: {
        feature: {
          saveAsImage: {
            title: t`dashboard_page_publication_by_year_graph_toolbox_save_as_image`,
            name: `Publications_OA_${yearRange.start}_${yearRange.end}`,
          },
        },
        right: 10,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        appendTo: 'body',
        formatter: (params) => {
          if (!Array.isArray(params)) return ''
          const item = filteredData[params[0].dataIndex]
          const percent = ((item.oa / item.total) * 100).toFixed(2)
          const title =
            t`dashboard_page_publication_by_year_graph_tooltip_year` +
            ' ' +
            item.year
          const total =
            t`dashboard_page_publication_by_year_graph_tooltip_total` +
            ' ' +
            item.total
          const oa =
            t`dashboard_page_publication_by_year_graph_open_access` +
            ' ' +
            item.oa +
            ' (' +
            percent +
            '%)'
          let html = `<div style="min-width:250px; font-family:sans-serif;">
          <div style="font-weight:bold; ">${title}</div>
          <div style="display:flex; justify-content:space-between;"><span>${total}</span></div>
          <div style="display:flex ; justify-content:space-between; color:#91cc75; border-bottom:1px solid #eee; padding-bottom:5px; margin-bottom:5px;"><span>${oa}</span></div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px; margin-top:10px; font-size:11px;">`

          Object.entries(item.details).forEach(([key, val]) => {
            const color = val.color || '#ccc'
            html += `<div style="display:flex; align-items:center;">
            <span style="width:7px; height:7px; border-radius:50%; margin-right:5px; background:${color}"></span>
            ${key}: <b>${val.value}</b>
          </div>`
          })

          const color = '#81888f'
          html += `<div style="display:flex; align-items:center;">
            <span style="width:7px; height:7px; border-radius:50%; margin-right:5px; background:${color}"></span>
            ${t`dashboard_page_publication_by_year_graph_tooltip_unknown`}: <b>${item.unknown}</b>
          </div>`
          return html
        },
      },
      legend: {
        data: [
          t`dashboard_page_publication_by_year_graph_legend_open_access`,
          t`dashboard_page_publication_by_year_graph_legend_closed_access`,
          t`dashboard_page_publication_by_year_graph_legend_unknown`,
        ],
        bottom: 0,
      },
      xAxis: {
        type: 'category',
        data: filteredData.map((d) => d.year),
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: t`dashboard_page_publication_by_year_graph_legend_open_access`,
          type: 'bar',
          stack: 'total',
          data: filteredData.map((d) => d.oa),
          itemStyle: { color: '#91cc75' },
          label: {
            show: true,
            position: 'inside',
            formatter: (param) =>
              !Number.isNaN(param.value) && Number(param.value) != 0
                ? Math.round(
                    (Number(param.value) /
                      filteredData[param.dataIndex].total) *
                      100,
                  ) + '%'
                : '',
          },
        },
        {
          name: t`dashboard_page_publication_by_year_graph_legend_unknown`,
          type: 'bar',
          stack: 'total',
          data: filteredData.map((d) => d.unknown),
          itemStyle: { color: '#81888f' },
          label: {
            show: true,
            position: 'inside',
            formatter: (param) =>
              !Number.isNaN(param.value) && Number(param.value) != 0
                ? Math.round(
                    (Number(param.value) /
                      filteredData[param.dataIndex].total) *
                      100,
                  ) + '%'
                : '',
          },
        },
        {
          name: t`dashboard_page_publication_by_year_graph_legend_closed_access`,
          type: 'bar',
          stack: 'total',
          data: filteredData.map((d) => d.total - (d.oa + d.unknown)),
          itemStyle: { color: '#5470c6' },
          label: {
            show: true,
            position: 'inside',
            formatter: (param) =>
              !Number.isNaN(param.value) && Number(param.value) != 0
                ? Math.round(
                    (Number(param.value) /
                      filteredData[param.dataIndex].total) *
                      100,
                  ) + '%'
                : '',
          },
        },
      ],
    }
  }, [filteredData, yearRange])

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
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 3,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
              }}
            >
              <Typography>{t`dashboard_page_publication_by_year_graph_start_year_selection_label`}</Typography>
              <Select
                value={yearRange.start}
                onChange={(event) =>
                  setYearRange({
                    start: event.target.value as number,
                    end: yearRange.end,
                  })
                }
              >
                {Array.from(
                  {
                    length: oldestYear
                      ? currentYear - oldestYear + 1
                      : currentYear - (currentYear - 5) + 1,
                  },
                  (_, i) => (oldestYear ? oldestYear + i : currentYear - 5 + i),
                ).map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
              }}
            >
              <Typography>{t`dashboard_page_publication_by_year_graph_end_year_selection_label`}</Typography>
              <Select
                value={yearRange.end}
                onChange={(event) =>
                  setYearRange({
                    start: yearRange.start,
                    end: event.target.value as number,
                  })
                }
              >
                {Array.from(
                  { length: currentYear - yearRange.start + 1 },
                  (_, i) => yearRange.start + i,
                ).map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          </Box>
          {filteredData.length == 0 ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <BlockIcon />
              <Typography
                sx={{ fontWeight: 600 }}
              >{t`dashboard_page_publication_by_year_no_publication_found`}</Typography>
            </Box>
          ) : (
            <Box>
              {option && (
                <ReactEcharts
                  option={option}
                  notMerge={true}
                  lazyUpdate={true}
                />
              )}
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}
export default PublicationCard
