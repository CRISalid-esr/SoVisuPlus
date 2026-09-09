import { Box, CircularProgress, Typography } from '@mui/material'
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
import { useMemo } from 'react'
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

type PublicationCardProps = {
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

const PublicationCard = ({
  yearRange,
  data = [],
  loading = false,
}: PublicationCardProps) => {
  const oldestYear = useMemo(() => {
    const years = Object.keys(data)
      .map(Number)
      .filter((year) => !Number.isNaN(year))
    if (years.length == 0) return null
    return Math.min(...years)
  }, [data])

  const filteredData = useMemo(() => {
    const processedData = Object.entries(data)
      .map(([year, docs]) => {
        if (Number(year) >= yearRange[0] && Number(year) <= yearRange[1]) {
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
    return processedData
  }, [data, yearRange])

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
            name: `Publications_OA_${yearRange[0]}_${yearRange[1]}`,
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
