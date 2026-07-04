import { ChangeEventWorker } from '@/lib/amqp/workers/ChangeEventWorker'
import { DocumentDAO } from '@/lib/daos/DocumentDAO'
import { AMQPChangeEventMessage } from '@/types/AMQPChangeEventMessage'

jest.mock('@/lib/daos/DocumentDAO')

const buildMessage = (
  overrides: Partial<AMQPChangeEventMessage['fields']> = {},
  event: 'applied' | 'failed' = 'failed',
): AMQPChangeEventMessage => ({
  type: 'change',
  event,
  fields: {
    uid: 'sovisuplus:action-1',
    id: 'action-1',
    application: 'sovisuplus',
    person_uid: 'person-1',
    target_type: 'DOCUMENT',
    target_uid: 'doc-1',
    path: 'contributions',
    action_type: 'UPDATE',
    status: event,
    error_message: event === 'failed' ? 'boom' : null,
    warnings: [],
    timestamp: '2026-01-01T09:00:00Z',
    ...overrides,
  },
})

describe('ChangeEventWorker', () => {
  let documentDAO: jest.Mocked<DocumentDAO>

  beforeEach(() => {
    jest.clearAllMocks()
    documentDAO = new DocumentDAO() as jest.Mocked<DocumentDAO>
    documentDAO.resetDocumentsWaitingForUpdate = jest.fn().mockResolvedValue([])
    documentDAO.getDocumentLabelsByUid = jest
      .fn()
      .mockResolvedValue({ en: 'A title' })
  })

  it('resets the waiting state and emits an outcome event on failure', async () => {
    const worker = new ChangeEventWorker(buildMessage(), documentDAO)

    const events = await worker.process()

    expect(documentDAO.resetDocumentsWaitingForUpdate).toHaveBeenCalledWith([
      'doc-1',
    ])
    expect(events).toHaveLength(1)
    expect(events[0].toJSON()).toEqual({
      type: 'user_action_outcome',
      actionId: 'action-1',
      outcome: 'failed',
      personUid: 'person-1',
      targetType: 'DOCUMENT',
      targetUid: 'doc-1',
      path: 'contributions',
      actionType: 'UPDATE',
      errorMessage: 'boom',
      warnings: [],
      objectLabels: { en: 'A title' },
      timestamp: '2026-01-01T09:00:00Z',
    })
  })

  it('does not touch the document state on success', async () => {
    const warnings = [
      {
        code: 'UNRESOLVABLE_PERSON',
        message: 'Skipping contribution with unresolvable person',
        context: { display_name: 'Claire Durand' },
      },
    ]
    const worker = new ChangeEventWorker(
      buildMessage({ warnings, error_message: null }, 'applied'),
      documentDAO,
    )

    const events = await worker.process()

    expect(documentDAO.resetDocumentsWaitingForUpdate).not.toHaveBeenCalled()
    expect(events).toHaveLength(1)
    expect(events[0].outcome).toBe('applied')
    expect(events[0].warnings).toEqual(warnings)
  })

  it('falls back to the uid label when the document is unknown locally', async () => {
    documentDAO.getDocumentLabelsByUid = jest.fn().mockResolvedValue({})
    const worker = new ChangeEventWorker(buildMessage(), documentDAO)

    const events = await worker.process()

    expect(events[0].objectLabels).toEqual({ ul: 'doc-1' })
  })

  it('tolerates a payload without warnings', async () => {
    const worker = new ChangeEventWorker(
      buildMessage({ warnings: undefined }),
      documentDAO,
    )

    const events = await worker.process()

    expect(events[0].warnings).toEqual([])
  })

  it('still emits an event for an unknown target type without touching documents', async () => {
    const worker = new ChangeEventWorker(
      buildMessage({ target_type: 'PERSON', target_uid: 'person-2' }),
      documentDAO,
    )

    const events = await worker.process()

    expect(documentDAO.resetDocumentsWaitingForUpdate).not.toHaveBeenCalled()
    expect(documentDAO.getDocumentLabelsByUid).not.toHaveBeenCalled()
    expect(events).toHaveLength(1)
    expect(events[0].objectLabels).toEqual({ ul: 'person-2' })
  })

  it('returns no event when fields are missing', async () => {
    const message = {
      type: 'change',
      event: 'failed',
    } as AMQPChangeEventMessage
    const worker = new ChangeEventWorker(message, documentDAO)

    const events = await worker.process()

    expect(events).toEqual([])
  })
})
