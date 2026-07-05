'use client'

import { useState } from 'react'
import { Trans } from '@lingui/react'
import { Button } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import { UserActionOutcomeEvent } from '@/types/UserActionOutcomeEvent'

/**
 * Raw, untranslated diagnostic record of a user-action outcome, meant to be
 * pasted into a support ticket: it carries the action id (correlates with the
 * `Action` row here and the `Change` node in the graph) and the verbatim
 * error/warning payload from the graph.
 */
export const outcomeDetailsText = (event: UserActionOutcomeEvent): string =>
  JSON.stringify(
    {
      actionId: event.actionId,
      outcome: event.outcome,
      targetType: event.targetType,
      targetUid: event.targetUid,
      path: event.path,
      actionType: event.actionType,
      errorMessage: event.errorMessage,
      warnings: event.warnings,
      timestamp: event.timestamp,
    },
    null,
    2,
  )

/**
 * Collapsed "technical details" box shown inside outcome toasts. The content
 * is deliberately untranslated (it mirrors graph logs) and selectable; the
 * button copies the whole record to the clipboard.
 */
export const UserActionOutcomeDetails = ({
  event,
}: {
  event: UserActionOutcomeEvent
}) => {
  const [copied, setCopied] = useState(false)
  const text = outcomeDetailsText(event)

  const copy = () => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <details style={{ marginTop: 4 }}>
      <summary style={{ cursor: 'pointer', fontSize: '0.85em' }}>
        <Trans id='user_action_outcome_technical_details' />
      </summary>
      <pre
        style={{
          maxHeight: 200,
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontSize: '0.75em',
          userSelect: 'text',
          margin: '4px 0',
        }}
      >
        {text}
      </pre>
      <Button
        size='small'
        color='inherit'
        startIcon={
          copied ? (
            <CheckIcon fontSize='small' />
          ) : (
            <ContentCopyIcon fontSize='small' />
          )
        }
        onClick={copy}
      >
        {copied ? (
          <Trans id='user_action_outcome_details_copied' />
        ) : (
          <Trans id='user_action_outcome_copy_details' />
        )}
      </Button>
    </details>
  )
}
