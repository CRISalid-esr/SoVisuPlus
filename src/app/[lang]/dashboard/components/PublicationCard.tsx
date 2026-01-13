import { Box, CircularProgress } from '@mui/material'
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
import { useEffect, useMemo, useRef, useState } from 'react'
import { Document } from '@/types/Document'
import dayjs from 'dayjs'
import { OAStatus } from '@prisma/client'

type ChartOption = ComposeOption<
  | BarSeriesOption
  | TitleComponentOption
  | TooltipComponentOption
  | GridComponentOption
  | DatasetComponentOption
  | ToolboxComponentOption
>

const PublicationCard = () => {
  const {
    fetchDocuments,
    documents = [],
    loading,
    latestDocumentRequestId,
  } = useStore((state) => state.document)

  const { currentPerspective } = useStore((state) => state.user)

  const data = useMemo(
    () =>
      documents.reduce<Record<number, Document[]>>((acc, doc) => {
        const publicationDate = doc.publicationDate
        if (publicationDate) {
          const parsedDate = dayjs(publicationDate)
          if (parsedDate.isValid()) {
            const year = parsedDate.year()
            acc[year] ??= []
            acc[year].push(doc)
          }
        }
        return acc
      }, {}),
    [documents],
  )

  const oldestYear = useMemo(() => {
    const years = Object.keys(data)
      .map(Number)
      .filter((year) => !Number.isNaN(year))
    if (years.length == 0) return null
    return Math.min(...years)
  }, [data])

  const currentYear = useMemo(() => dayjs().year(), [])

  const [yearRange, setYearRange] = useState({
    start: currentYear - 5,
    end: currentYear,
  })

  const filteredData = useMemo(() => {
    return Object.entries(data)
      .map(([year, docs]) => {
        if (Number(year) >= yearRange.start && Number(year) <= yearRange.end) {
          return {
            year: Number(year),
            total: docs.length,
            oa: docs.filter(
              (doc) =>
                (doc.upwOAStatus && doc.upwOAStatus == OAStatus.CLOSED) ||
                (doc.oaStatus && doc.oaStatus !== OAStatus.CLOSED),
            ).length,
            details: {
              'Unpaywall Diamond': docs.filter(
                (doc) => doc.upwOAStatus == OAStatus.DIAMOND,
              ).length,
              'Unpaywall Gold': docs.filter(
                (doc) => doc.upwOAStatus == OAStatus.GOLD,
              ).length,
              'Unpaywall Bronze': docs.filter(
                (doc) => doc.upwOAStatus == OAStatus.BRONZE,
              ).length,
              'Unpaywall Hybrid': docs.filter(
                (doc) => doc.upwOAStatus == OAStatus.HYBRID,
              ).length,
              'Unpaywall Other': docs.filter(
                (doc) => doc.upwOAStatus == OAStatus.OTHER,
              ).length,
            },
          }
        }
      })
      .filter((value) => value !== undefined)
  }, [data, yearRange])

  const requestIdRef = useRef(latestDocumentRequestId || 0)

  useEffect(() => {
    const contributorUid = currentPerspective?.uid
    const contributorType = currentPerspective?.type
    if (!contributorType || !contributorUid) return
    const nextRequestId = ++requestIdRef.current
    fetchDocuments({
      page: 1,
      pageSize: 1000,
      searchTerm: '',
      searchLang:
        process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',')[0] || '',
      columnFilters: JSON.stringify([]),
      sorting: JSON.stringify([
        {
          id: 'date',
          desc: true,
        },
      ]),
      requestId: nextRequestId,
      contributorUid: contributorUid,
      contributorType: contributorType,
      halCollectionCodes: JSON.stringify([]),
      areHalCollectionCodesOmitted: true,
    }).catch((error) => {
      console.error('Error fetching documents:', error)
    })
  }, [currentPerspective, fetchDocuments])

  const option: ChartOption = {
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
    legend: {
      data: [
        t`dashboard_page_publication_by_year_graph_legend_open_access`,
        t`dashboard_page_publication_by_year_graph_legend_closed_access`,
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
            Number.isNaN(param.value)
              ? Math.round(
                  (Number(param.value) / filteredData[param.dataIndex].total) *
                    100,
                ) + '%'
              : '',
        },
      },
      {
        name: t`dashboard_page_publication_by_year_graph_legend_closed_access`,
        type: 'bar',
        stack: 'total',
        data: filteredData.map((d) => d.total - d.oa),
        itemStyle: { color: '#5470c6' },
      },
    ],
  }

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
        <ReactEcharts option={option} />
      )}
    </Box>
  )
}
export default PublicationCard
