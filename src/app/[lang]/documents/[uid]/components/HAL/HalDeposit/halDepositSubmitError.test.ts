import { i18n } from '@lingui/core'
import { messages } from '@/locales/en/messages'
import { describeHalDepositFailure } from './halDepositSubmitError'

beforeAll(() => {
  i18n.load('en', messages)
  i18n.activate('en')
})

/** Every reason the route can send, so a new one cannot be added without a message. */
const REASONS = [
  'type_not_depositable',
  'missing_identifiers',
  'missing_publication_date',
  'missing_journal',
  'missing_bilingual_title',
  'missing_bilingual_abstract',
  'missing_bilingual_keywords',
  'no_hal_affiliation',
  'missing_main_file',
  'multiple_main_files',
  'main_file_license_required',
  'file_missing_from_upload',
  'not_authenticated',
  'forbidden',
  'person_not_found',
  'document_not_found',
  'missing_payload',
  'invalid_payload',
  'internal_error',
]

describe('describeHalDepositFailure', () => {
  it.each(REASONS)('translates %s', (reason) => {
    const message = describeHalDepositFailure(reason)
    // A missing catalog entry makes Lingui echo the id back, which is the bug this guards.
    expect(message).not.toBe(reason)
    expect(message.trim()).not.toBe('')
  })

  it('gives distinct messages to distinct reasons', () => {
    // `missing_payload` and `invalid_payload` deliberately share one message.
    const messages = new Set(REASONS.map((r) => describeHalDepositFailure(r)))
    expect(messages.size).toBe(REASONS.length - 1)
  })

  it('names the offending field for missing_field', () => {
    expect(describeHalDepositFailure('missing_field:bookTitle')).toContain(
      'Book title',
    )
  })

  it('labels the supervisor field according to the document type', () => {
    const these = describeHalDepositFailure('missing_field:supervisor', 'THESE')
    const hdr = describeHalDepositFailure('missing_field:supervisor', 'HDR')
    expect(these).not.toBe(hdr)
  })

  it('falls back to the generic message when there is no reason', () => {
    expect(describeHalDepositFailure(undefined)).toMatch(/could not be sent/i)
  })

  it('falls back for a reason this build does not know', () => {
    expect(describeHalDepositFailure('reason_from_a_newer_server')).toMatch(
      /could not be sent/i,
    )
  })
})
