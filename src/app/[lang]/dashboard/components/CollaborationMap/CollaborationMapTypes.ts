import { ComposeOption, ECElementEvent } from 'echarts/core'
import {
  GeoComponentOption,
  ToolboxComponentOption,
  TooltipComponentOption,
} from 'echarts/components'
import { ScatterSeriesOption } from 'echarts/charts'
import { DocumentData } from '@/app/[lang]/dashboard/page'
import { ECharts } from 'echarts'

export type AffiliationData = {
  longitude: number
  latitude: number
  name: string
  documents: Record<string, DocumentData>
}

export type Point = {
  longitude: number
  latitude: number
  count: number
  data: Record<string, Record<string, DocumentData>>
}

export type EChartsEventHandler = (
  params: ECElementEvent,
  chart: ECharts,
) => void

export type ChartOption = ComposeOption<
  | GeoComponentOption
  | ScatterSeriesOption
  | ToolboxComponentOption
  | TooltipComponentOption
>

export type MapCollaborationsProps = {
  yearRange: [number, number]
  loading: boolean
  data: Record<number, DocumentData[]>
}
