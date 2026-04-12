'use client'

import useStore from '@/stores/global_store'
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Alert, Box, Paper, Snackbar, Tooltip, Typography } from '@mui/material'
import { Trans } from '@lingui/react'
import { HalLoginButton } from '@/app/[lang]/account/components/myProfile/components/identifiers/HalLoginButton'
import LinkIcon from '@mui/icons-material/Link'
import { PersonIdentifierType } from '@prisma/client'
import { isPerson } from '@/types/Person'
import IdentifierPill from './IdentifierPill'

const HalControl = () => {
  const { connectedUser, currentPerspective, ownPerspective } = useStore(
    (state) => state.user,
  )
  const searchParams = useSearchParams()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [severity, setSeverity] = useState<'success' | 'error'>('success')
  const [messageKey, setMessageKey] = useState<string | null>(null)

  // When viewing another person's account, read their identifiers from currentPerspective
  const person =
    ownPerspective || !currentPerspective || !isPerson(currentPerspective)
      ? connectedUser?.person
      : currentPerspective
  const identifiers = person?.getIdentifiers() ?? []

  const { halValue, halKind, halLogin } = useMemo(() => {
    const idHalS = identifiers.find(
      (identifier) => identifier.type === PersonIdentifierType.idhals,
    )?.value

    const idHalI = identifiers.find(
      (identifier) => identifier.type === PersonIdentifierType.idhali,
    )?.value

    const halLogin = identifiers.find(
      (identifier) => identifier.type === PersonIdentifierType.hal_login,
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

  useEffect(() => {
    if (!ownPerspective) return
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success && !success.startsWith('hal_')) return
    if (error && !error.startsWith('hal_')) return

    if (success) {
      setSeverity('success')
      setMessageKey(success)
      setOpen(true)
    } else if (error) {
      setSeverity('error')
      setMessageKey(error)
      setOpen(true)
    }
  }, [searchParams, ownPerspective])

  // Read-only view for non-own accounts: show identifier value, no auth controls
  if (!ownPerspective) {
    return (
      <Paper
        elevation={1}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          p: 2,
          width: '100%',
          borderRadius: 2,
        }}
      >
        <Typography variant='subtitle1' fontWeight='bold'>
          HAL
        </Typography>
        {hasHalIdentifier && halValue ? (
          <IdentifierPill
            value={halValue}
            iconLabel='HAL'
            iconColor='#4A90D9'
            subLabel={halKind ?? undefined}
          />
        ) : (
          <Typography variant='body2' color='text.secondary'>
            <Trans id='hal_control_not_available' />
          </Typography>
        )}
      </Paper>
    )
  }

  const handleClose = () => {
    setOpen(false)
    const url = new URL(window.location.href)
    url.searchParams.delete('success')
    url.searchParams.delete('error')
    router.replace(url.pathname, { scroll: false })
  }

  const renderMessage = () => {
    switch (messageKey) {
      case 'hal_authentication_success':
        return <Trans id='hal_authentication_success' />
      case 'hal_authentication_failure':
        return <Trans id='hal_authentication_failure' />
      case 'hal_authentication_failure_no_ticket':
        return <Trans id='hal_authentication_failure_no_ticket' />
      case 'hal_authentication_failure_no_session':
        return <Trans id='hal_authentication_failure_no_session' />
      case 'hal_authentication_failure_user_not_found':
        return <Trans id='hal_authentication_failure_user_not_found' />
      case 'hal_authentication_failure_misconfig':
        return <Trans id='hal_authentication_failure_misconfig' />
      case 'hal_auth_missing_data':
        return <Trans id='hal_auth_missing_data' />
      case 'hal_unavailable_data':
        return <Trans id='hal_unavailable_data' />
      case 'hal_missing_identifiers':
        return <Trans id='hal_missing_identifiers' />
      case 'hal_identifier_insert_failure':
        return <Trans id='hal_identifier_insert_failure' />
      case 'hal_authentication_failure_wrong_protocol':
        return <Trans id='hal_authentication_failure_wrong_protocol' />
      case 'hal_authentication_failure_account_creation':
        return <Trans id='hal_authentication_failure_account_creation' />
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
          gap: 1.5,
          p: 2,
          width: '100%',
          borderRadius: 2,
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

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          {hasHalIdentifier && halValue && (
            <IdentifierPill
              value={halValue}
              iconLabel='HAL'
              iconColor='#4A90D9'
              subLabel={halKind ?? undefined}
            />
          )}

          {isLinked && halLogin && (
            <IdentifierPill
              value={halLogin}
              iconLabel='HAL'
              iconColor='#4A90D9'
              subLabel='hal_login'
            />
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
