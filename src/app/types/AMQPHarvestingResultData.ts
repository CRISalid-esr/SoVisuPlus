import { AMQPData } from '@/types/AMQPData'

export interface AMQPHarvestingResultData extends AMQPData {
  reference_event: {
    type: 'created' | 'updated' | 'unchanged' | 'deleted'
    reference: {
      source_identifier: string
      harvester: string
      harvester_version: string
      identifiers: Array<{ type: string; value: string }>
      manifestations: Array<unknown>
      titles: Array<{ value: string; language: string }>
      subtitles: Array<{ value: string; language: string }>
      abstracts: Array<{ value: string; language: string | null }>
      subjects: Array<{
        uri?: string | null
        dereferenced?: boolean
        pref_labels?: Array<{ value: string; language?: string | null }>
        alt_labels?: Array<{ value: string; language?: string | null }>
      }>
      document_type: Array<{ uri?: string; label?: string }>
      contributions: Array<{
        rank?: number
        contributor: {
          source?: string
          source_identifier?: string
          name?: string
          first_name?: string
          last_name?: string
          name_variants?: Array<string>
          structured_name_variants?: Array<{
            last_name?: string
            first_name?: string
          }>
          identifiers?: Array<{
            source?: string
            type?: string
            value?: string
          }>
        }
        role?: string
        affiliations?: Array<unknown>
      }>
      issue?: unknown | null
      page?: unknown | null
      book?: unknown | null
      raw_issued: string | null
      issued: string | null
      created?: unknown | null
      custom_metadata?: unknown | null
      version: number
    }
    enhanced: boolean
  }
  entity: {
    identifiers: Array<{ type: string; value: string }>
    name: string
  }
}
