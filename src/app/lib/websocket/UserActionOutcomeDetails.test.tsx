import { outcomeDetailsText } from '@/lib/websocket/UserActionOutcomeDetails'
import { UserActionOutcomeEvent } from '@/types/UserActionOutcomeEvent'

describe('outcomeDetailsText', () => {
  const event = new UserActionOutcomeEvent(
    'action-1',
    'failed',
    'person-1',
    'DOCUMENT',
    'doc-1',
    'contributions',
    'UPDATE',
    'Target document does not exist',
    [
      {
        code: 'UNRESOLVABLE_PERSON',
        message: 'Skipping contribution with unresolvable person',
        context: { display_name: 'Claire Durand' },
      },
    ],
    { en: 'A title' },
    '2026-01-01T09:00:00Z',
  )

  it('serializes the raw diagnostic payload for copy-paste', () => {
    const text = outcomeDetailsText(event)
    const parsed = JSON.parse(text)

    expect(parsed).toEqual({
      actionId: 'action-1',
      outcome: 'failed',
      targetType: 'DOCUMENT',
      targetUid: 'doc-1',
      path: 'contributions',
      actionType: 'UPDATE',
      errorMessage: 'Target document does not exist',
      warnings: [
        {
          code: 'UNRESOLVABLE_PERSON',
          message: 'Skipping contribution with unresolvable person',
          context: { display_name: 'Claire Durand' },
        },
      ],
      timestamp: '2026-01-01T09:00:00Z',
    })
  })

  it('keeps the raw untranslated warning message and context verbatim', () => {
    const text = outcomeDetailsText(event)

    expect(text).toContain('Skipping contribution with unresolvable person')
    expect(text).toContain('"display_name": "Claire Durand"')
  })
})
