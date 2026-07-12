'use client'

import useStore from '@/stores/global_store'
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material'
import { Trans } from '@lingui/react'
import { HalLoginButton } from '@/app/[lang]/account/components/myProfile/components/identifiers/HalLoginButton'
import ManualIdentifierAddForm from './ManualIdentifierAddForm'
import HalInfoBox from './HalInfoBox'
import { useIdentifierCapabilities } from './useIdentifierCapabilities'
import LinkIcon from '@mui/icons-material/Link'
import { PersonIdentifierType } from '@prisma/client'
import { isPerson } from '@/types/Person'
import IdentifierPill from './IdentifierPill'

const IDHAL_S_REGEX = /^[a-z0-9-]+$/i
const IDHAL_I_REGEX = /^\d+$/

const HalControl = () => {
  const {
    connectedUser,
    currentPerspective,
    ownPerspective,
    removePersonIdentifier,
  } = useStore((state) => state.user)
  const searchParams = useSearchParams()
  const router = useRouter()

  // When viewing another person's account, read their identifiers from currentPerspective
  const person =
    ownPerspective || !currentPerspective || !isPerson(currentPerspective)
      ? connectedUser?.person
      : currentPerspective
  const identifiers = person?.getIdentifiers() ?? []

  const { halValue, halType, halLogin } = useMemo(() => {
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
      halType: idHalS
        ? PersonIdentifierType.idhals
        : idHalI
          ? PersonIdentifierType.idhali
          : null,
      halLogin: halLogin ?? null,
    }
  }, [identifiers])

  const halKind =
    halType === PersonIdentifierType.idhals ? 'idHal_s' : 'idHal_i'

  const { isAuthenticated, canAuthenticate, canAddUnauthenticated, canRemove } =
    useIdentifierCapabilities(
      person,
      halType ?? PersonIdentifierType.idhals,
      ownPerspective,
    )

  const hasHalIdentifier = Boolean(halValue)
  const isLinked = hasHalIdentifier && isAuthenticated

  const [open, setOpen] = useState(false)
  const [severity, setSeverity] = useState<'success' | 'error'>('success')
  const [messageKey, setMessageKey] = useState<string | null>(null)
  const [openConfirm, setOpenConfirm] = useState(false)

  const notify = (success: boolean, key: string) => {
    setSeverity(success ? 'success' : 'error')
    setMessageKey(key)
    setOpen(true)
  }

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

  const hasAnyCapability = canAuthenticate || canAddUnauthenticated || canRemove

  const remove = async () => {
    if (!person?.uid || !halType) return
    setOpenConfirm(false)
    const result = await removePersonIdentifier(person.uid, halType)
    notify(
      result.success,
      result.success ? 'hal_remove_success' : 'hal_remove_failure',
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
      case 'hal_authentication_value_mismatch':
        return <Trans id='hal_authentication_value_mismatch' />
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
      case 'hal_manual_add_success':
        return <Trans id='hal_manual_add_success' />
      case 'hal_manual_add_failure':
        return <Trans id='hal_manual_add_failure' />
      case 'hal_manual_add_conflict':
        return <Trans id='hal_manual_add_conflict' />
      case 'hal_remove_success':
        return <Trans id='hal_remove_success' />
      case 'hal_remove_failure':
        return <Trans id='hal_remove_failure' />
      default:
        return null
    }
  }

  // Read-only view: viewer has no capability on this identifier
  if (!hasAnyCapability) {
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
            subLabel={halKind}
          />
        ) : (
          <Typography variant='body2' color='text.secondary'>
            <Trans id='hal_control_not_available' />
          </Typography>
        )}
      </Paper>
    )
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
              subLabel={halKind}
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

          {/* Authenticate: own account, not yet authenticated */}
          {!isLinked && canAuthenticate && (
            <HalLoginButton halProvided={hasHalIdentifier} />
          )}
        </Box>

        {hasHalIdentifier && canRemove && (
          <Button
            color='error'
            variant='outlined'
            onClick={() => setOpenConfirm(true)}
            sx={{ minWidth: 'fit-content', alignSelf: 'flex-start' }}
          >
            <Trans id='hal_control_remove_button' />
          </Button>
        )}

        {/* Manual add without authenticating: wide-scoped editors, empty slot */}
        {!hasHalIdentifier && canAddUnauthenticated && person?.uid && (
          <ManualIdentifierAddForm
            personUid={person.uid}
            variants={[
              {
                type: PersonIdentifierType.idhals,
                label: 'idHal_s',
                regex: IDHAL_S_REGEX,
              },
              {
                type: PersonIdentifierType.idhali,
                label: 'idHal_i',
                regex: IDHAL_I_REGEX,
              },
            ]}
            inputLabel='idHAL'
            renderPreview={({ value, type, onReady }) => (
              <HalInfoBox
                value={value}
                kind={
                  type === PersonIdentifierType.idhali ? 'idhali' : 'idhals'
                }
                forceOpen
                onReady={onReady}
              />
            )}
            onResult={(r) =>
              notify(
                r.success,
                r.success
                  ? 'hal_manual_add_success'
                  : r.conflict
                    ? 'hal_manual_add_conflict'
                    : 'hal_manual_add_failure',
              )
            }
          />
        )}

        <Typography variant='caption' color='text.secondary'>
          <Trans id='hal_control_helper' />
        </Typography>
      </Paper>

      <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)}>
        <DialogTitle>
          <Trans id='hal_control_remove_dialog_title' />
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <Trans id='hal_control_remove_dialog_text' />
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirm(false)}>
            <Trans id='identifier_dialog_cancel_button' />
          </Button>
          <Button color='error' onClick={remove}>
            <Trans id='hal_control_remove_dialog_confirm' />
          </Button>
        </DialogActions>
      </Dialog>

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
