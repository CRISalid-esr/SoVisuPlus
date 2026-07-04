'use client'

import { useEffect, useRef } from 'react'
import { useSnackbar } from 'notistack'
import useStore from '@/stores/global_store'
import { Trans } from '@lingui/react'
import {
  GenericEvent,
  isDataEvent,
  isHalDepositEvent,
  isHarvestingResultEvent,
  isHarvestingStateEvent,
  isUserActionOutcomeEvent,
} from '@/types/GenericEvent'
import { ChangeWarningFields } from '@/types/AMQPChangeEventMessage'
import { IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { SnackbarKey } from 'notistack'
import { buildWebSocketURL } from '@/lib/websocket/ws-url'
import * as Lingui from '@lingui/core'
import { useSearchParams } from 'next/navigation'

// One line per warning attached to a change outcome. Codes come from the
// graph's open taxonomy; unknown codes fall back to a generic message.
// Static <Trans id> branches only — dynamic ids are not extracted.
const warningLine = (warning: ChangeWarningFields) => {
  const context = warning.context ?? {}
  const displayName = String(context.display_name ?? '')
  const organizationUid = String(context.source_organization_uid ?? '')
  switch (warning.code) {
    case 'UNRESOLVABLE_PERSON':
      return (
        <Trans
          id='user_action_warning_unresolvable_person'
          values={{ displayName }}
        />
      )
    case 'EXTERNAL_PERSON_CREATION_FAILED':
      return (
        <Trans
          id='user_action_warning_external_person_creation_failed'
          values={{ displayName }}
        />
      )
    case 'MISSING_DISPLAY_NAME':
      return <Trans id='user_action_warning_missing_display_name' />
    case 'AFFILIATION_CONFLICT':
      return (
        <Trans
          id='user_action_warning_affiliation_conflict'
          values={{ organizationUid }}
        />
      )
    case 'AFFILIATION_WITHOUT_IDENTIFIER':
      return <Trans id='user_action_warning_affiliation_without_identifier' />
    default:
      return <Trans id='user_action_warning_unknown' />
  }
}

const WebSocketListener = () => {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar()
  const { startHarvesting, updateHarvestingStatus, incrementPlatformCount } =
    useStore((state) => state.harvesting)
  const { currentPerspective, connectedUser } = useStore((state) => state.user)
  const {
    setListHasChanged,
    setSelectedDocumentHasChanged,
    selectedDocument,
    unfreezeSelectedDocument,
  } = useStore((state) => state.document)
  const { applyDepositEvent } = useStore((state) => state.halDeposit)

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

      if (isHalDepositEvent(data)) {
        applyDepositEvent(data)
      }

      if (isUserActionOutcomeEvent(data)) {
        // Outcomes only concern the user who performed the action.
        const connectedUid = connectedUserRef?.person?.uid
        if (!connectedUid || data.personUid !== connectedUid) {
          return
        }

        if (data.outcome === 'failed') {
          // No document_updated message follows a failure: the listener
          // process reset the DB state, this resets the in-store copy.
          unfreezeSelectedDocument(data.targetUid)
        }

        const warnings = data.warnings || []
        if (data.outcome === 'applied' && warnings.length === 0) {
          // Clean success — the regular document_updated toast covers it.
          return
        }

        const labels = data.objectLabels || {}
        const currentLang = Lingui.i18n.locale as string
        const selectedLabel =
          (currentLang && labels[currentLang]) || Object.values(labels)[0] || ''

        const params = new URLSearchParams(searchParams?.toString())
        params.set(
          'tab',
          data.path === 'contributions'
            ? 'authors'
            : 'bibliographic_information',
        )

        const dismissAction = (snackbarId: SnackbarKey) => (
          <IconButton
            size='small'
            color='inherit'
            onClick={() => closeSnackbar(snackbarId)}
          >
            <CloseIcon fontSize='small' />
          </IconButton>
        )

        enqueueSnackbar(
          <div>
            {data.outcome === 'failed' ? (
              <Trans id='snackbar_user_action_failed' />
            ) : (
              <Trans id='snackbar_user_action_applied_with_warnings' />
            )}
            {selectedLabel && (
              <strong style={{ marginLeft: 6 }}>{selectedLabel}</strong>
            )}
            {data.targetType === 'DOCUMENT' && (
              <a
                href={`/documents/${data.targetUid}` + '?' + params.toString()}
                style={{ marginLeft: 8 }}
              >
                <Trans id='snackbar_view_document' />
              </a>
            )}
            {data.outcome === 'failed' && data.errorMessage && (
              <div style={{ fontSize: '0.85em', opacity: 0.8 }}>
                {data.errorMessage}
              </div>
            )}
            {warnings.length > 0 && (
              <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                {warnings.map((warning, index) => (
                  <li key={index}>{warningLine(warning)}</li>
                ))}
              </ul>
            )}
          </div>,
          data.outcome === 'failed'
            ? { variant: 'error', persist: true, action: dismissAction }
            : {
                variant: 'warning',
                autoHideDuration: 30000,
                action: dismissAction,
              },
        )
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
    applyDepositEvent,
    searchParams,
    unfreezeSelectedDocument,
    closeSnackbar,
  ])

  return null
}
export default WebSocketListener
