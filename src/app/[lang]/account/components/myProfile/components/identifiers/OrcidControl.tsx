import useStore from '@/stores/global_store'
import React, { useEffect, useState } from 'react'
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
  Link,
  Paper,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material'
import { PidComponent } from '@kit-data-manager/react-pid-component'
import styles from './OrcidControl.module.css'
import { OrcidLoginButton } from '@/app/[lang]/account/components/myProfile/components/identifiers/OrcidLoginButton'
import ManualIdentifierAddForm from './ManualIdentifierAddForm'
import { useIdentifierCapabilities } from './useIdentifierCapabilities'
import { Trans } from '@lingui/react'
import { ORCIDIdentifier } from '@/types/OrcidIdentifier'
import LinkIcon from '@mui/icons-material/Link'
import { PersonIdentifierType as DbPersonIdentifierType } from '@prisma/client'
import { isPerson } from '@/types/Person'

const ORCID_REGEX = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i

const OrcidControl = () => {
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

  const { isAuthenticated, canAuthenticate, canAddUnauthenticated, canRemove } =
    useIdentifierCapabilities(
      person,
      DbPersonIdentifierType.orcid,
      ownPerspective,
    )

  const [open, setOpen] = useState(false)
  const [severity, setSeverity] = useState<'success' | 'error'>('success')
  const [messageKey, setMessageKey] = useState<string | null>(null)
  const [openConfirm, setOpenConfirm] = useState(false)

  const identifiers = person?.getIdentifiers() ?? []
  const orcidIdentifier = identifiers.find(
    (i) => i.type === DbPersonIdentifierType.orcid,
  ) as ORCIDIdentifier | undefined

  const orcid = orcidIdentifier?.value
  const isLinked = isAuthenticated

  const notify = (success: boolean, key: string) => {
    setSeverity(success ? 'success' : 'error')
    setMessageKey(key)
    setOpen(true)
  }

  useEffect(() => {
    if (!ownPerspective) return
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success && !success.startsWith('orcid_')) return
    if (error && !error.startsWith('orcid_')) return

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
    if (!person?.uid) return
    setOpenConfirm(false)
    const result = await removePersonIdentifier(
      person.uid,
      DbPersonIdentifierType.orcid,
    )
    notify(
      result.success,
      result.success ? 'orcid_remove_success' : 'orcid_remove_failure',
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
      case 'orcid_authentication_success':
        return <Trans id='orcid_authentication_success' />
      case 'orcid_authentication_failure':
        return <Trans id='orcid_authentication_failure' />
      case 'orcid_authentication_failure_no_code':
        return <Trans id={'orcid_authentication_failure_no_code'} />
      case 'orcid_authentication_failure_no_session':
        return <Trans id={'orcid_authentication_failure_no_session'} />
      case 'orcid_authentication_failure_user_not_found':
        return <Trans id={'orcid_authentication_failure_user_not_found'} />
      case 'orcid_authentication_value_mismatch':
        return <Trans id={'orcid_authentication_value_mismatch'} />
      case 'orcid_insert_failure':
        return <Trans id={'orcid_insert_failure'} />
      case 'orcid_manual_add_success':
        return <Trans id={'orcid_manual_add_success'} />
      case 'orcid_manual_add_failure':
        return <Trans id={'orcid_manual_add_failure'} />
      case 'orcid_manual_add_conflict':
        return <Trans id={'orcid_manual_add_conflict'} />
      case 'orcid_remove_success':
        return <Trans id={'orcid_remove_success'} />
      case 'orcid_remove_failure':
        return <Trans id={'orcid_remove_failure'} />
      default:
        return null
    }
  }

  const orcidPid = orcid ? (
    <>
      {/* Mobile / tablet */}
      <Box
        sx={{
          display: { xs: 'inline-flex', lg: 'none' },
          alignItems: 'center',
          gap: 1,
          px: 1.25,
          py: 0.5,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'action.hover',
          maxWidth: '100%',
          minWidth: 0,
        }}
      >
        <Typography
          variant='caption'
          color='text.secondary'
          sx={{ lineHeight: 1 }}
        >
          ORCID
        </Typography>
        <Typography
          variant='body2'
          sx={{
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
            minWidth: 0,
          }}
        >
          {orcid}
        </Typography>
      </Box>
      {/* Desktop */}
      <Box sx={{ display: { xs: 'none', lg: 'block' }, minWidth: 0 }}>
        <PidComponent
          value={orcid}
          emphasizeComponent={true}
          className={styles['pid-components']}
        />
      </Box>
    </>
  ) : (
    <Typography variant='body2' color='text.secondary'>
      <Trans id='orcid_identifier_no_orcid_provided' />
    </Typography>
  )

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
          minWidth: 0,
        }}
      >
        <Typography variant='subtitle1' fontWeight='bold'>
          ORCID
        </Typography>
        {orcidPid}
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
          minWidth: 0,
        }}
      >
        {/* Header row: label + linked icon */}
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}
        >
          <Typography variant='subtitle1' fontWeight='bold'>
            ORCID
          </Typography>
          {isLinked && (
            <Tooltip title={<Trans id='orcid_account_linked_tooltip' />} arrow>
              <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                <LinkIcon fontSize='small' />
              </Box>
            </Tooltip>
          )}
        </Box>

        {orcidPid}

        {orcid && canRemove && (
          <Button
            color='error'
            variant='outlined'
            onClick={() => setOpenConfirm(true)}
            sx={{ minWidth: 'fit-content', alignSelf: 'flex-start' }}
          >
            <Trans id='orcid_control_remove_button' />
          </Button>
        )}

        {/* Authenticate: own account, not yet authenticated */}
        {!isLinked && canAuthenticate && (
          <OrcidLoginButton
            orcidProvided={!!orcid}
            grantedScopes={orcidIdentifier?.oauth?.scope ?? null}
            hasOauth={isLinked}
          />
        )}

        {/* Manual add without authenticating: wide-scoped editors, empty slot */}
        {!orcid && canAddUnauthenticated && person?.uid && (
          <ManualIdentifierAddForm
            personUid={person.uid}
            variants={[
              {
                type: DbPersonIdentifierType.orcid,
                label: 'ORCID',
                regex: ORCID_REGEX,
              },
            ]}
            inputLabel='ORCID'
            onResult={(r) =>
              notify(
                r.success,
                r.success
                  ? 'orcid_manual_add_success'
                  : r.conflict
                    ? 'orcid_manual_add_conflict'
                    : 'orcid_manual_add_failure',
              )
            }
          />
        )}

        {/* Helper text */}
        <Typography variant='caption' color='text.secondary'>
          <Trans
            id='orcid_control_helper'
            components={[
              <Link
                key='orcid-link'
                href='https://orcid.org'
                target='_blank'
                rel='noopener noreferrer'
                underline='always'
              />,
            ]}
          />
        </Typography>
      </Paper>

      <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)}>
        <DialogTitle>
          <Trans id='orcid_control_remove_dialog_title' />
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <Trans id='orcid_control_remove_dialog_text' />
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirm(false)}>
            <Trans id='identifier_dialog_cancel_button' />
          </Button>
          <Button color='error' onClick={remove}>
            <Trans id='orcid_control_remove_dialog_confirm' />
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
export default OrcidControl
