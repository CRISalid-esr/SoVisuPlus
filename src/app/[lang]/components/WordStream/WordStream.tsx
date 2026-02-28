'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Box, Card, CardContent, CircularProgress } from '@mui/material'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { AgentType } from '@/types/IAgent'
import { WordstreamData, WordstreamTopic } from '@/types/WordStream'
import { t } from '@lingui/core/macro'

type WordStreamProps = {
  uid: string
  entityType: AgentType
  lang: ExtendedLanguageCode
  topics?: WordstreamTopic[]
  fromYear?: number
  toYear?: number
  topN?: number
  autoSize?: boolean
  width?: number
  height?: number
  topWord?: number
  minFont?: number
  maxFont?: number
  tickFont?: number
  legendFont?: number
}

const DEFAULT_XS_HEIGHT = 360

const DEFAULT_MD_HEIGHT = 480
const WordStream = ({
  uid,
  entityType,
  lang,
  topics = [WordstreamTopic.Concepts, WordstreamTopic.CoAuthors],
  fromYear,
  toYear,
  topN,
  autoSize = true,
  width = 1000,
  height = 600,
  topWord = 20,
  minFont = 15,
  maxFont = 30,
  tickFont = 12,
  legendFont = 12,
}: WordStreamProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [ready, setReady] = useState<boolean>(
    () => typeof window !== 'undefined' && !!window.d3 && !!window.wordstream,
  )
  const [data, setData] = useState<WordstreamData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (ready) return
    const id = window.setInterval(() => {
      if (
        typeof window.d3 !== 'undefined' &&
        typeof window.wordstream === 'function'
      ) {
        setReady(true)
        window.clearInterval(id)
      }
    }, 50)
    return () => window.clearInterval(id)
  }, [ready])
  const [measured, setMeasured] = useState<{ w: number; h: number }>(() => ({
    w: width,
    h: height,
  }))

  const dataUrl = useMemo(() => {
    if (!uid || !entityType) return null
    const qs = new URLSearchParams()
    qs.set('uid', uid)
    qs.set('entityType', entityType)
    qs.set('lang', lang)
    if (topics?.length) qs.set('topic', topics.join(','))
    if (fromYear) qs.set('fromYear', String(fromYear))
    if (toYear) qs.set('toYear', String(toYear))
    if (topN) qs.set('top', String(topN))
    return `/api/wordstream?${qs.toString()}`
  }, [uid, entityType, lang, topics, fromYear, toYear, topN])

  // Observe parent size if autoSize
  useLayoutEffect(() => {
    if (!autoSize || !containerRef.current) return
    const el = containerRef.current
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect
        const w = Math.max(0, Math.floor(cr.width))
        const h = Math.max(0, Math.floor(cr.height))
        setMeasured({ w, h })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [autoSize])

  // Fetch data
  useEffect(() => {
    if (!dataUrl) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setData(null)
    ;(async () => {
      try {
        const res = await fetch(dataUrl, { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        const wordstreamData = WordstreamData.fromJson(json)
        if (!cancelled) setData(wordstreamData)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [dataUrl])

  // Re-render on size change
  useEffect(() => {
    if (!ready || !data || !svgRef.current) return
    if (data.slices.length === 0) {
      setError(t`wordstream_no_data_to_display`)
      return
    }
    const d3 = window.d3
    const svg = d3.select(svgRef.current)

    svg.selectAll('*').remove()

    const W = autoSize ? measured.w : width
    const H = autoSize ? measured.h : height
    if (!W || !H) return

    svg
      .attr('width', W)
      .attr('height', H)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')

    const config = {
      topWord,
      minFont,
      maxFont,
      tickFont,
      legendFont,
      curve: window.d3.curveLinear,
    }

    window.wordstream(svg, data.slices, config)
  }, [
    ready,
    data?.slices,
    autoSize,
    measured.w,
    measured.h,
    width,
    height,
    topWord,
    minFont,
    maxFont,
    tickFont,
    legendFont,
  ])

  const showSpinner =
    loading ||
    !ready ||
    (!data && !error) ||
    (autoSize && (!measured.w || !measured.h))

  if (data && data.slices.length === 0) {
    return (
      <Card variant='outlined'>
        <CardContent>
          <Box sx={{ color: 'text.secondary', p: 2 }}>
            {t`wordstream_no_data_to_display`}
          </Box>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant='outlined'>
      <CardContent>
        <Box
          ref={containerRef}
          sx={{
            position: 'relative',
            width: '100%',
            height: autoSize
              ? { xs: DEFAULT_XS_HEIGHT, md: DEFAULT_MD_HEIGHT }
              : undefined,
            minHeight: 120,
          }}
        >
          {showSpinner ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ color: 'error.main', p: 2 }}>Error: {error}</Box>
          ) : (
            <svg ref={svgRef} />
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
export default WordStream
