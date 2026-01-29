'use client'

import useStore from '@/stores/global_store'
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Alert, Box, Paper, Snackbar, Tooltip, Typography } from '@mui/material'
import { PersonIdentifierType } from '@/types/PersonIdentifier'
import { Trans } from '@lingui/react'
import { HalLoginButton } from '@/app/[lang]/account/components/myProfile/components/identifiers/HalLoginButton'
import LinkIcon from '@mui/icons-material/Link'

const HalControl = () => {
  const { connectedUser } = useStore((state) => state.user)
  const person = connectedUser?.person
  const identifiers = person?.getIdentifiers() ?? []

  const { halValue, halKind, halLogin } = useMemo(() => {
    const idHalS = identifiers.find(
      (identifier) => identifier.type === PersonIdentifierType.ID_HAL_S,
    )?.value

    const idHalI = identifiers.find(
      (identifier) => identifier.type === PersonIdentifierType.ID_HAL_I,
    )?.value

    const halLogin = identifiers.find(
      (identifier) => identifier.type === PersonIdentifierType.HAL_LOGIN,
    )?.value

    return {
      halValue: idHalS ?? idHalI ?? null,
      halKind: idHalS ? 'idHal_s' : idHalI ? 'idHal_i' : null,
      halLogin: halLogin ?? null,
    }
  }, [identifiers])

  const hasHalIdentifier = Boolean(halValue)
  const hasHalLogin = Boolean(halLogin)
  const isLinked = hasHalIdentifier && hasHalLogin

  const searchParams = useSearchParams()
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [severity, setSeverity] = useState<'success' | 'error'>('success')
  const [messageKey, setMessageKey] = useState<string | null>(null)

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success) {
      setSeverity('success')
      setMessageKey(success)
      setOpen(true)
    } else if (error) {
      setSeverity('error')
      setMessageKey(error)
      setOpen(true)
    }
  }, [searchParams])

  const handleClose = () => {
    setOpen(false)
    const url = new URL(window.location.href)
    url.searchParams.delete('success')
    url.searchParams.delete('error')
    router.replace(url.pathname, { scroll: false })
  }

  const renderMessage = () => {
    switch (messageKey) {
      case 'hal-authentication-success':
        return <Trans id='hal-authentication-success' />
      case 'hal-authentication-failure':
        return <Trans id='hal-authentication-failure' />
      case 'hal-authentication-failure-no-ticket':
        return <Trans id='hal-authentication-failure-no-ticket' />
      case 'hal-authentication-failure-no-session':
        return <Trans id='hal-authentication-failure-no-session' />
      case 'hal-authentication-failure-user-not-found':
        return <Trans id='hal-authentication-failure-user-not-found' />
      case 'hal-authentication-failure-misconfig':
        return <Trans id='hal-authentication-failure-misconfig' />
      case 'hal-auth-missing-data':
        return <Trans id='hal-auth-missing-data' />
      case 'hal-unavailable-data':
        return <Trans id='hal-unavailable-data' />
      case 'hal-missing-identifiers':
        return <Trans id='hal-missing-identifiers' />
      case 'hal-identifier-insert-failure':
        return <Trans id='hal-identifier-insert-failure' />
      default:
        return null
    }
  }

  return (
    <>
      <Paper
        elevation={1}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          p: 2,
          width: '100%',
          borderRadius: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            width: '100%',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant='subtitle1' fontWeight='bold'>
              HAL
            </Typography>

            {isLinked && (
              <Tooltip title={<Trans id='hal_account_linked_tooltip' />} arrow>
                <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                  <LinkIcon fontSize='small' />
                </Box>
              </Tooltip>
            )}
          </Box>

          {hasHalIdentifier && (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 1.25,
                py: 0.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'action.hover',
              }}
            >
              {halKind && (
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ lineHeight: 1 }}
                >
                  {halKind}
                </Typography>
              )}

              <Typography
                variant='body2'
                sx={{
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                }}
              >
                {halValue}
              </Typography>
            </Box>
          )}

          {isLinked && (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 1.25,
                py: 0.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'action.hover',
              }}
            >
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ lineHeight: 1 }}
              >
                hal_login
              </Typography>

              <Typography
                variant='body2'
                sx={{
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                }}
              >
                {halLogin}
              </Typography>
            </Box>
          )}

          {/* Button rules:
              - If identifier present but no login => show button
              - If no identifier and no login => show button
              - If identifier + login => no button
          */}
          {!isLinked && <HalLoginButton halProvided={hasHalIdentifier} />}
        </Box>

        <Typography variant='caption' color='text.secondary'>
          <Trans id='hal_control_helper' />
        </Typography>
      </Paper>

      <Snackbar
        open={open}
        autoHideDuration={6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleClose} severity={severity} sx={{ width: '100%' }}>
          {renderMessage()}
        </Alert>
      </Snackbar>
    </>
  )
}

export default HalControl
