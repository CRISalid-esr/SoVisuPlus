import { NextRequest, NextResponse } from 'next/server'
import {
  DocumentAggregateService,
  isWordstreamTopic,
} from '@/lib/services/DocumentAggregateService'
import {
  ExtendedLanguageCode,
  isExtendedLanguageCode,
} from '@/types/ExtendLanguageCode'
import { agentTypeFromString } from '@/types/IAgent'
import { WordstreamTopic } from '@/types/WordStream'

export const GET = async (req: NextRequest) => {
  try {
    const sp = req.nextUrl.searchParams

    // --- required: uid ---
    const uid = sp.get('uid')?.trim()
    if (!uid) {
      return NextResponse.json(
        { error: "Missing required query parameter 'uid'." },
        { status: 400 },
      )
    }

    // --- required: entityType ---
    const entityTypeStr = sp.get('entityType')?.toLowerCase()
    const entityType = agentTypeFromString(entityTypeStr ?? null)
    if (!entityType) {
      return NextResponse.json(
        {
          error:
            "Invalid or missing 'entityType'. Allowed values: 'person'|'research_structure'|'institution'.",
        },
        { status: 400 },
      )
    }

    // --- required: lang ---
    const langRaw = sp.get('lang')?.toLowerCase() ?? ''
    if (!isExtendedLanguageCode(langRaw)) {
      return NextResponse.json(
        {
          error: "Invalid 'lang'. Must be ISO-639-1 (e.g. 'fr','en') or 'ul'.",
        },
        { status: 400 },
      )
    }
    const lang = langRaw as ExtendedLanguageCode

    // --- required: topic (allow comma-separated list) ---
    const topicRaw = sp.get('topic')?.toLowerCase() ?? ''
    if (!topicRaw) {
      return NextResponse.json(
        { error: "Missing required query parameter 'topic'." },
        { status: 400 },
      )
    }
    const topicStrs = topicRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const topics: WordstreamTopic[] = []
    for (const topic of topicStrs) {
      if (!isWordstreamTopic(topic)) {
        return NextResponse.json(
          {
            error:
              "Invalid 'topic'. Allowed values: 'concept'|'person'|'journal' . For multiple, use comma-separated.",
          },
          { status: 400 },
        )
      }
      topics.push(topic)
    }

    // --- optional: fromYear, toYear, top ---
    const fromYear = sp.get('fromYear') ? Number(sp.get('fromYear')) : undefined
    const toYear = sp.get('toYear') ? Number(sp.get('toYear')) : undefined
    const top = sp.get('top') ? Number(sp.get('top')) : undefined

    if (fromYear !== undefined && !Number.isInteger(fromYear)) {
      return NextResponse.json(
        { error: "'fromYear' must be an integer year." },
        { status: 400 },
      )
    }
    if (toYear !== undefined && !Number.isInteger(toYear)) {
      return NextResponse.json(
        { error: "'toYear' must be an integer year." },
        { status: 400 },
      )
    }
    if (top !== undefined && (!Number.isInteger(top) || top <= 0)) {
      return NextResponse.json(
        { error: "'top' must be a positive integer." },
        { status: 400 },
      )
    }

    // --- compute data ---
    const svc = new DocumentAggregateService()
    const data = await svc.computeWordStreamForAgent(
      uid,
      entityType,
      lang,
      topics,
      {
        fromYear,
        toYear,
        topNPerTopic: top,
      },
    )

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error computing wordstream:', error)
    return NextResponse.json(
      { error: 'Error computing wordstream' },
      { status: 500 },
    )
  }
}
