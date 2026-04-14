// file: tests/app/components/WebSocketListener.test.tsx

import { render, waitFor } from '@testing-library/react'
import WebSocketListener from '@/lib/websocket/WebSocketListener'
import useStore from '@/stores/global_store'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import { Harvesting } from '@/types/Harvesting'
import { Person } from '@/types/Person'
import { User } from '@/types/User'
import { Document, DocumentType } from '@/types/Document'
import { Literal } from '@/types/Literal'
import { Concept } from '@/types/Concept'
import { Contribution } from '@/types/Contribution'
import { LocRelator } from '@/types/LocRelator'
import { SnackbarProvider, useSnackbar } from 'notistack'
import * as React from 'react'
import { OAStatus } from '@prisma/client'
import MainLayout from '@/app/[lang]/layouts/MainLayout'

jest.mock('notistack', () => {
  const originalModule = jest.requireActual('notistack')
  return {
    __esModule: true,
    ...originalModule,
    useSnackbar: jest.fn(() => ({ enqueueSnackbar: jest.fn() })),
  }
})

class MockWebSocket extends EventTarget {
  static OPEN = 1
  readyState = MockWebSocket.OPEN
  url: string
  send = jest.fn()
  close = jest.fn()
  onmessage: ((this: WebSocket, ev: MessageEvent<string>) => void) | null = null

  constructor(url: string) {
    super()
    this.url = url
  }

  emitMessage(data: unknown) {
    const messageEvent = new MessageEvent('message', {
      data: JSON.stringify(data),
    })
    ;(this.onmessage as (ev: MessageEvent<string>) => void)?.(messageEvent)
  }
}

const connectedUserPerson = new Person(
  'person-1',
  false,
  'john@example.com',
  'John Doe',
  'John',
  'Doe',
  [],
)

const mockUser = new User(1, connectedUserPerson)

const document: Document = new Document(
  'doc-123',
  DocumentType.Document,
  OAStatus.GREEN,
  '2022',
  new Date('2022-01-01T00:00:00.000Z'),
  new Date('2022-12-31T23:59:59.000Z'),
  OAStatus.DIAMOND,
  [new Literal('Sample Document Title', 'en')],
  [new Literal('Sample Abstract', 'en')],
  [
    new Concept(
      'concept-123',
      [
        Literal.fromObject({
          value: 'Concept preferred label',
          language: 'en',
        }),
      ],
      [Literal.fromObject({ value: 'Concept alt label', language: 'en' })],
      'http://example.com/concept/123',
    ),
  ],
  [
    new Contribution(connectedUserPerson, [
      LocRelator.AUTHOR_OF_INTRODUCTION__ETC_,
    ]),
  ],
)

describe('WebSocketListener', () => {
  beforeEach(() => {
    useStore.setState({
      user: {
        connectedUser: mockUser,
        currentPerspective: connectedUserPerson,
        ownPerspective: true,
        loading: false,
        error: null,
        fetchConnectedUser: jest.fn(),
        setPerspective: jest.fn(),
        setPerspectiveBySlug: jest.fn(),
        refreshPerspective: jest.fn(),
        updatePersonIdentifier: jest.fn(),
        removePersonIdentifier: jest.fn(),
      },
      document: {
        selectedDocument: document,
        setListHasChanged: jest.fn(),
        setSelectedDocumentHasChanged: jest.fn(),
        latestDocumentRequestId: undefined,
        documents: [],
        totalItems: undefined,
        count: {
          latestCountDocumentsRequestId: undefined,
          allItems: undefined,
          incompleteHalRepositoryItems: undefined,
          loading: false,
          error: null,
        },
        loading: false,
        listHasChanged: false,
        selectedDocumentHasChanged: false,
        fetchDocuments: jest.fn(),
        setHasFetched: jest.fn(),
        countDocuments: jest.fn(),
        fetchDocumentById: jest.fn(),
        removeConcepts: jest.fn(),
        addConcepts: jest.fn(),
        modifyTitles: jest.fn(),
        modifyAbstracts: jest.fn(),
        mergeDocuments: jest.fn(),
        updateDocumentType: jest.fn(),
        error: null,
      },
      harvesting: {
        harvestings: {
          'person-1': {
            [BibliographicPlatform.HAL]: new Harvesting(
              'person-1',
              BibliographicPlatform.HAL,
              'not_performed',
            ),
          },
        },
        startHarvesting: jest.fn(),
        updateHarvestingStatus: jest.fn(),
        incrementPlatformCount: jest.fn(),
        initializeHarvesting: jest.fn(),
        triggerHarvestings: jest.fn(),
      },
    })
  })

  it('reacts to harvesting_state_event and updates store accordingly', async () => {
    const OriginalWebSocket = window.WebSocket
    const mockWSInstance = new MockWebSocket('ws://localhost:3001')
    // @ts-expect-error override global
    window.WebSocket = jest.fn(() => mockWSInstance)
    render(
      <SnackbarProvider>
        <WebSocketListener />
      </SnackbarProvider>,
    )

    mockWSInstance.emitMessage({
      type: 'harvesting_state',
      personUid: 'person-1',
      platform: 'hal',
      state: 'running',
    })

    await waitFor(() => {
      const state = useStore.getState()
      expect(state.harvesting.startHarvesting).toHaveBeenCalledWith(
        'person-1',
        BibliographicPlatform.HAL,
      )
    })

    window.WebSocket = OriginalWebSocket
  })

  it('reacts to harvesting_result_event and updates store accordingly', async () => {
    const OriginalWebSocket = window.WebSocket
    const mockWSInstance = new MockWebSocket('ws://localhost:3001')
    // @ts-expect-error override global
    window.WebSocket = jest.fn(() => mockWSInstance)
    render(
      <SnackbarProvider>
        <WebSocketListener />
      </SnackbarProvider>,
    )

    mockWSInstance.emitMessage({
      type: 'harvesting_result',
      personUid: 'person-1',
      platform: 'hal',
      status: 'created',
    })

    await waitFor(() => {
      const state = useStore.getState()
      expect(state.harvesting.incrementPlatformCount).toHaveBeenCalledWith(
        'person-1',
        BibliographicPlatform.HAL,
        'created',
      )
    })

    window.WebSocket = OriginalWebSocket
  })

  it('reacts to completed harvesting_state_event and updates store', async () => {
    const OriginalWebSocket = window.WebSocket
    const mockWSInstance = new MockWebSocket('ws://localhost:3001')
    // @ts-expect-error override global
    window.WebSocket = jest.fn(() => mockWSInstance)
    render(
      <SnackbarProvider>
        <WebSocketListener />
      </SnackbarProvider>,
    )

    mockWSInstance.emitMessage({
      type: 'harvesting_state',
      personUid: 'person-1',
      platform: 'hal',
      state: 'completed',
    })

    await waitFor(() => {
      const state = useStore.getState()
      expect(state.harvesting.updateHarvestingStatus).toHaveBeenCalledWith(
        'person-1',
        BibliographicPlatform.HAL,
        'completed',
      )
    })

    window.WebSocket = OriginalWebSocket
  })

  it('enqueues snackbar for data event', async () => {
    const enqueueSnackbarMock = jest.fn()
    ;(useSnackbar as jest.Mock).mockReturnValue({
      enqueueSnackbar: enqueueSnackbarMock,
    })

    const OriginalWebSocket = window.WebSocket
    const mockWSInstance = new MockWebSocket('ws://localhost:3001')
    // @ts-expect-error override global
    window.WebSocket = jest.fn(() => mockWSInstance)

    render(
      <SnackbarProvider>
        <WebSocketListener />
      </SnackbarProvider>,
    )

    mockWSInstance.emitMessage({
      type: 'data',
      objectType: 'Document',
      objectUid: 'doc-123',
      eventType: 'created',
      objectLabels: { en: 'Test document', fr: 'Document de test' },
      impliedPeopleUids: ['person-1'],
    })

    await waitFor(() => {
      expect(enqueueSnackbarMock).toHaveBeenCalled()
    })

    window.WebSocket = OriginalWebSocket
  })
  it('does not enqueue snackbar for data event if user is not implied', async () => {
    const enqueueSnackbarMock = jest.fn()
    ;(useSnackbar as jest.Mock).mockReturnValue({
      enqueueSnackbar: enqueueSnackbarMock,
    })

    const OriginalWebSocket = window.WebSocket
    const mockWSInstance = new MockWebSocket('ws://localhost:3001')
    // @ts-expect-error override global
    window.WebSocket = jest.fn(() => mockWSInstance)

    render(
      <SnackbarProvider>
        <WebSocketListener />
      </SnackbarProvider>,
    )

    mockWSInstance.emitMessage({
      type: 'data',
      objectType: 'Document',
      objectUid: 'doc-123',
      eventType: 'created',
      objectLabels: { en: 'Test document', fr: 'Document de test' },
      impliedPeopleUids: ['person-2'], // different person
    })

    await new Promise((r) => setTimeout(r, 500)) // wait a bit to ensure no snackbar is called
    expect(enqueueSnackbarMock).not.toHaveBeenCalled()

    window.WebSocket = OriginalWebSocket
  })
})
