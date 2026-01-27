'use client'

import useStore from '@/stores/global_store'
import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Alert, Paper, Snackbar, Typography } from '@mui/material'
import { PersonIdentifierType } from '@/types/PersonIdentifier'
import { Trans } from '@lingui/react'
import { HalLoginButton } from '@/app/[lang]/account/components/myProfile/components/identifiers/HalLoginButton'

const HalControl = () => {
  const { connectedUser } = useStore((state) => state.user)
  const person = connectedUser?.person
  const identifiers = person?.getIdentifiers() ?? []

  const idHalS = identifiers.find(
    (identifier) => identifier.type === PersonIdentifierType.ID_HAL_S,
  )?.value

  const idHalI = identifiers.find(
    (identifier) => identifier.type === PersonIdentifierType.ID_HAL_I,
  )?.value

  const hal = idHalS ?? idHalI ?? null

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
          alignItems: 'center',
          gap: 2,
          p: 2,
          width: '100%',
          borderRadius: 2,
        }}
      >
        <Typography
          variant='subtitle1'
          fontWeight='bold'
          sx={{ alignSelf: 'center' }}
        >
          HAL
        </Typography>

        {hal && (
          <Typography variant='body2' sx={{ alignSelf: 'center' }}>
            {hal}
          </Typography>
        )}

        {!hal && (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ alignSelf: 'normal' }}
          >
            <Trans id='hal_identifier_not_available' />
          </Typography>
        )}

        <HalLoginButton halProvided={!!hal} />
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
