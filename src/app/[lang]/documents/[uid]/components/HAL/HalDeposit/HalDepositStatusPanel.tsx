'use client'

import { useState } from 'react'
import { Trans } from '@lingui/react/macro'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Link,
  Typography,
} from '@mui/material'
import {
  CheckCircle,
  ErrorOutline,
  HourglassEmpty,
  Info,
  OpenInNew,
  WarningAmber,
} from '@mui/icons-material'
import DOMPurify from 'dompurify'
import useStore from '@/stores/global_store'
import type { HalDepositView } from '@/stores/halDepositSlice'
import {
  parseHalDepositError,
  type HalDepositErrorNode,
} from './halDepositErrorFormat'

const REFRESHABLE = ['verify', 'update', 'delete']

// Force HAL's message links to open safely in a new tab. Registered once at module scope.
if (typeof DOMPurify.addHook === 'function') {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer')
    }
  })
}

interface Props {
  deposit: HalDepositView
  onNavigateTab: (tab: string) => void
}

/** Status panel shown once a deposit exists for the document (keyed on `deposit.status`). */
export function HalDepositStatusPanel({ deposit }: Props) {
  const { refreshDeposit } = useStore((s) => s.halDeposit)
  const [refreshing, setRefreshing] = useState(false)

  const submittedAt = deposit.createdAt
    ? new Date(deposit.createdAt).toLocaleDateString()
    : null

  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshDeposit(deposit.id)
    setRefreshing(false)
  }

  const view = STATUS_VIEWS[deposit.status] ?? STATUS_VIEWS.pending

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        {view.icon}
        <Typography variant='h6' sx={{ color: view.color }}>
          {view.title}
        </Typography>
      </Box>

      {submittedAt && (
        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
          <Trans>hal_deposit_status_submitted_on</Trans> {submittedAt}
        </Typography>
      )}

      <Alert severity={view.severity} sx={{ mb: 2 }}>
        {view.message}
        {deposit.status === 'error' && deposit.lastError && (
          <HalDepositErrorDetail lastError={deposit.lastError} />
        )}
      </Alert>

      {deposit.halId && (
        <Typography variant='body2' sx={{ mb: 1 }}>
          <Trans>hal_deposit_status_hal_identifier</Trans>:{' '}
          {deposit.halUrl ? (
            <Link href={deposit.halUrl} target='_blank' rel='noopener'>
              {deposit.halId} <OpenInNew sx={{ fontSize: 14 }} />
            </Link>
          ) : (
            deposit.halId
          )}
        </Typography>
      )}

      {deposit.comment && (
        <Alert severity='warning' sx={{ mb: 2 }}>
          {deposit.comment}
        </Alert>
      )}

      {REFRESHABLE.includes(deposit.status) && (
        <Button
          variant='outlined'
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <Trans>hal_deposit_status_refreshing</Trans>
          ) : (
            <Trans>hal_deposit_status_refresh</Trans>
          )}
        </Button>
      )}
    </Box>
  )
}

/**
 * Renders the stored `lastError` of a failed deposit. For a HAL SWORD rejection it shows the
 * summary followed by a bulleted list of reasons, each `key: message`, with the HAL-provided HTML
 * message sanitised and rendered so it displays correctly. Any other error string is shown as-is.
 */
function HalDepositErrorDetail({ lastError }: { lastError: string }) {
  const { summary, reasons } = parseHalDepositError(lastError)

  if (!reasons) {
    return (
      <Typography
        variant='body2'
        sx={{ mt: 0.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
      >
        <Trans>hal_deposit_status_error_message_label</Trans> {lastError}
      </Typography>
    )
  }

  return (
    <Box sx={{ mt: 0.5 }}>
      <Typography variant='body2'>
        <Trans>hal_deposit_status_error_message_label</Trans>
        {summary ? ` ${summary.replace(/\.?$/, '.')}` : ''}
      </Typography>
      <ErrorReasonList nodes={reasons} />
    </Box>
  )
}

/**
 * Renders reason nodes as a bulleted list. A leaf shows `key: <sanitised HTML message>`; a branch
 * (nested object) shows a bold `key:` followed by a nested sub-list of its children, recursively.
 */
function ErrorReasonList({ nodes }: { nodes: HalDepositErrorNode[] }) {
  return (
    <Box component='ul' sx={{ my: 0.5, pl: 3, '& li': { mt: 0.5 } }}>
      {nodes.map((node) => (
        <Typography key={node.key} component='li' variant='body2'>
          <Box component='span' sx={{ fontWeight: 600 }}>
            {node.key}:
          </Box>
          {'children' in node ? (
            <ErrorReasonList nodes={node.children} />
          ) : (
            <>
              {' '}
              <Box
                component='span'
                sx={{ wordBreak: 'break-word' }}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(node.valueHtml, {
                    USE_PROFILES: { html: true },
                  }),
                }}
              />
            </>
          )}
        </Typography>
      ))}
    </Box>
  )
}

type StatusView = {
  icon: React.ReactNode
  color: string
  severity: 'info' | 'success' | 'warning' | 'error'
  title: React.ReactNode
  message: React.ReactNode
}

const STATUS_VIEWS: Record<string, StatusView> = {
  pending: {
    icon: (
      <LinearProgress color='info' sx={{ width: 96, borderRadius: 1 }} />
    ),
    color: 'info.main',
    severity: 'info',
    title: <Trans>hal_deposit_status_in_progress_title</Trans>,
    message: <Trans>hal_deposit_status_in_progress_message</Trans>,
  },
  running: {
    icon: <CircularProgress size={22} thickness={5} color='info' />,
    color: 'info.main',
    severity: 'info',
    title: <Trans>hal_deposit_status_in_progress_title</Trans>,
    message: <Trans>hal_deposit_status_in_progress_message</Trans>,
  },
  verify: {
    icon: <HourglassEmpty sx={{ color: 'warning.main' }} />,
    color: 'warning.main',
    severity: 'warning',
    title: <Trans>hal_deposit_status_moderation_title</Trans>,
    message: <Trans>hal_deposit_status_moderation_message</Trans>,
  },
  accept: {
    icon: <CheckCircle color='success' />,
    color: 'success.main',
    severity: 'success',
    title: <Trans>hal_deposit_status_published_title</Trans>,
    message: <Trans>hal_deposit_status_published_message</Trans>,
  },
  update: {
    icon: <WarningAmber sx={{ color: 'warning.main' }} />,
    color: 'warning.main',
    severity: 'warning',
    title: <Trans>hal_deposit_status_changes_title</Trans>,
    message: <Trans>hal_deposit_status_changes_message</Trans>,
  },
  delete: {
    icon: <ErrorOutline color='error' />,
    color: 'error.main',
    severity: 'error',
    title: <Trans>hal_deposit_status_rejected_title</Trans>,
    message: <Trans>hal_deposit_status_rejected_message</Trans>,
  },
  replace: {
    icon: <Info color='disabled' />,
    color: 'text.secondary',
    severity: 'info',
    title: <Trans>hal_deposit_status_replaced_title</Trans>,
    message: <Trans>hal_deposit_status_replaced_message</Trans>,
  },
  error: {
    icon: <ErrorOutline color='error' />,
    color: 'error.main',
    severity: 'error',
    title: <Trans>hal_deposit_status_failed_title</Trans>,
    message: <Trans>hal_deposit_status_failed_message</Trans>,
  },
}
