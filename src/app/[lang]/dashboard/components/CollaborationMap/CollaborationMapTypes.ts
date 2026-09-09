import { ComposeOption, ECElementEvent } from 'echarts/core'
import {
  GeoComponentOption,
  ToolboxComponentOption,
  TooltipComponentOption,
} from 'echarts/components'
import { ScatterSeriesOption } from 'echarts/charts'
import { DashboardDocumentData } from '@/types/DashboardDocumentData'
import { ECharts } from 'echarts'

export type AffiliationData = {
  uid: string
  longitude: number
  latitude: number
  name: string
  documents: Record<string, DashboardDocumentData>
}

export type Point = {
  longitude: number
  latitude: number
  count: number
  data: Record<
    string,
    { name: string; documents: Record<string, DashboardDocumentData> }
  >
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
  data: Record<number, DashboardDocumentData[]>
  /** Person uids making up the perspective; contributors outside it are collaborators. */
  perimeterUids: string[]
}
