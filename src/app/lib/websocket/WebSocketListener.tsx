'use client'

import { useEffect, useRef } from 'react'
import { useSnackbar } from 'notistack'
import useStore from '@/stores/global_store'
import { Trans } from '@lingui/react'
import {
  GenericEvent,
  isDataEvent,
  isHarvestingResultEvent,
  isHarvestingStateEvent,
} from '@/types/GenericEvent'
import { buildWebSocketURL } from '@/lib/websocket/ws-url'
import * as Lingui from '@lingui/core'
import { useSearchParams } from 'next/navigation'

export default function WebSocketListener() {
  const { enqueueSnackbar } = useSnackbar()
  const { startHarvesting, updateHarvestingStatus, incrementPlatformCount } =
    useStore((state) => state.harvesting)
  const { currentPerspective, connectedUser } = useStore((state) => state.user)
  const { setListHasChanged, setSelectedDocumentHasChanged, selectedDocument } =
    useStore((state) => state.document)

  // keep fresh values available inside the ws callback
  const perspectiveRef = useRef(currentPerspective)
  const documentRef = useRef(selectedDocument)
  const userRef = useRef(connectedUser)
  const searchParams = useSearchParams()

  const snackBarVariantByEventType = (
    eventType: string,
  ): 'info' | 'success' | 'warning' | 'error' | 'default' => {
    switch (eventType) {
      case 'unchanged':
        return 'info'
      case 'created':
        return 'success'
      case 'updated':
        return 'warning'
      case 'deleted':
        return 'error'
      default:
        return 'default'
    }
  }

  useEffect(() => {
    perspectiveRef.current = currentPerspective
    documentRef.current = selectedDocument
    userRef.current = connectedUser
  }, [currentPerspective, selectedDocument, connectedUser])

  useEffect(() => {
    const ws = new WebSocket(buildWebSocketURL())

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as GenericEvent
      console.log('WebSocket message received:', data)

      const currentPerspectiveRef = perspectiveRef.current
      const selectedDocumentRef = documentRef.current
      const connectedUserRef = userRef.current

      if (isDataEvent(data)) {
        const variant = snackBarVariantByEventType(data.eventType)
        const peopleUids = data.impliedPeopleUids || []

        const currentUid = currentPerspectiveRef?.uid
        const currentPerspectiveImplied =
          currentUid && peopleUids.includes(currentUid)
        const userImplied =
          connectedUserRef?.person?.uid &&
          peopleUids.includes(connectedUserRef.person.uid)

        if (currentPerspectiveImplied) {
          setListHasChanged(true)
        }

        if (data.objectUid === selectedDocumentRef?.uid) {
          setSelectedDocumentHasChanged(true)
        }

        if (!currentPerspectiveImplied && !userImplied) {
          console.log(
            'WebSocket event not relevant to current perspective or user, ignoring.',
          )
          return
        }

        const labels = data.objectLabels || {}

        const currentLang = Lingui.i18n.locale as string
        const selectedLabel =
          (currentLang && labels[currentLang]) || Object.values(labels)[0] || ''
        const params = new URLSearchParams(searchParams?.toString())
        params.set('tab', 'bibliographic_information')

        enqueueSnackbar(
          <>
            {data.eventType === 'created' && (
              <Trans id='snackbar_document_created' />
            )}
            {data.eventType === 'updated' && (
              <Trans id='snackbar_document_updated' />
            )}
            {data.eventType === 'deleted' && (
              <Trans id='snackbar_document_deleted' />
            )}
            {data.eventType === 'unchanged' && (
              <Trans id='snackbar_document_unchanged' />
            )}
            {selectedLabel && (
              <strong style={{ marginLeft: 6 }}>{selectedLabel}</strong>
            )}
            {data.eventType !== 'deleted' && (
              <a
                href={`/documents/${data.objectUid}` + '?' + params.toString()}
                style={{ marginLeft: 8 }}
              >
                <Trans id='snackbar_view_document' />
              </a>
            )}
          </>,
          {
            variant,
            autoHideDuration: 15000,
          },
        )
      }

      if (isHarvestingStateEvent(data)) {
        if (data.state === 'running') {
          startHarvesting(data.personUid, data.platform)
        } else {
          updateHarvestingStatus(data.personUid, data.platform, data.state)
        }
      }

      if (isHarvestingResultEvent(data)) {
        incrementPlatformCount(data.personUid, data.platform, data.status)
      }
    }

    return () => ws.close()
  }, [
    enqueueSnackbar,
    currentPerspective,
    startHarvesting,
    updateHarvestingStatus,
    incrementPlatformCount,
    setListHasChanged,
    setSelectedDocumentHasChanged,
    selectedDocument,
    searchParams,
  ])

  return null
}
