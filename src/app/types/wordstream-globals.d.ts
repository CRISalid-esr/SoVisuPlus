import { WordstreamSlice } from '@/types/WordStream'

export {}

type WordstreamFn = (
  svg: SVGElement,
  data: WordstreamSlice[],
  config: {
    topWord: number
    minFont: number
    maxFont: number
    tickFont: number
    legendFont: number
    curve: any // eslint-disable-line @typescript-eslint/no-explicit-any
  },
) => void

declare global {
  interface Window {
    d3: typeof import('d3')
    wordstream: WordstreamFn
  }
}
