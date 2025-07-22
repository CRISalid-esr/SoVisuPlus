'use client'

import { useEffect, useRef } from 'react'
import { useSnackbar } from 'notistack'
import useStore from '@/stores/global_store'
import { Trans } from '@lingui/react'

export default function WebSocketListener() {
  const { enqueueSnackbar } = useSnackbar()
  const { startHarvesting, stopHarvesting, incrementPlatformCount } = useStore(
    (state) => state.harvesting,
  )
  const { currentPerspective } = useStore((state) => state.user)
  const { triggerReloadList, triggerReloadSelected, selectedDocument } =
    useStore((state) => state.document)
  const currentPerspectiveRef = useRef(currentPerspective)
  const selectedDocumentRef = useRef(selectedDocument)

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
    currentPerspectiveRef.current = currentPerspective
    selectedDocumentRef.current = selectedDocument
  }, [currentPerspective, selectedDocument])

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001')

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log('WebSocket message received:', data)

      const perspective = currentPerspectiveRef.current
      const selectedDoc = selectedDocumentRef.current
      console.log('Current perspective:', perspective)
      console.log('Selected document:', selectedDoc)

      if (data.objectType === 'Document') {
        const variant = snackBarVariantByEventType(data.eventType)
        const peopleUids = data.impliedPeopleUids || []
        if (peopleUids.includes(currentPerspective?.uid)) {
          triggerReloadList()
        }

        if (data.objectUid === selectedDocument?.uid) {
          triggerReloadSelected()
        }
        enqueueSnackbar(
          <>
            {/*switch with trans messages*/}
            {data.eventType === 'created' && (
              <Trans id={'snackbar_document_created'} />
            )}
            {data.eventType === 'updated' && (
              <Trans id={'snackbar_document_updated'} />
            )}
            {data.eventType === 'deleted' && (
              <Trans id={'snackbar_document_deleted'} />
            )}
            {data.eventType === 'unchanged' && (
              <Trans id={'snackbar_document_unchanged'} />
            )}
            <strong>{data.objectLabel}</strong>
            <a href={`/documents/${data.objectUid}`} style={{ marginLeft: 8 }}>
              <Trans id={'snackbar_view_document'} />
            </a>
          </>,
          {
            variant,
            autoHideDuration: 3000,
          },
        )
      }
      if (data.platform) {
        if (data.state && data.state === 'running') {
          startHarvesting(data.personUid, data.platform)
        }
        if (data.state && data.state === 'completed') {
          stopHarvesting(data.personUid, data.platform)
        }
        if (data.status) {
          incrementPlatformCount(data.personUid, data.platform, data.status)
        }
      }
    }

    return () => ws.close()
  }, [
    enqueueSnackbar,
    currentPerspective,
    startHarvesting,
    stopHarvesting,
    incrementPlatformCount,
    triggerReloadList,
    triggerReloadSelected,
    selectedDocument,
  ])

  return null
}
