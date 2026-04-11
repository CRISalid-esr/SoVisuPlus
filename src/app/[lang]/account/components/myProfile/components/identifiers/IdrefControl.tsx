'use client'

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material'
import useStore from '@/stores/global_store'
import { PersonIdentifierType } from '@/types/PersonIdentifier'
import { useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'
import { Can } from '@casl/react'
import EditIcon from '@mui/icons-material/Edit'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import IdRefInfoBox from './IdRefInfoBox'

const IDREF_REGEX = /^\d{8}[\dX]$/i

const IdrefControl = () => {
  const { connectedUser, updatePersonIdentifier, removePersonIdentifier } =
    useStore((s) => s.user)
  const { data: session } = useSession()
  const ability = useMemo(
    () => abilityFromAuthzContext(session?.user?.authz),
    [session?.user?.authz],
  )

  const person = connectedUser?.person
  const idref = person
    ?.getIdentifiers()
    .find((i) => i.type === PersonIdentifierType.idref)
  const idrefUrl = idref?.getUrl() ?? null

  const [edit, setEdit] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [openConfirm, setOpenConfirm] = useState(false)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    success: boolean
    messageId: string
  } | null>(null)

  // Confirm flow state: after clicking Save, show info box before DB write
  const [verifying, setVerifying] = useState(false)
  const [canConfirm, setCanConfirm] = useState(false)
  const [verifyingValue, setVerifyingValue] = useState('')
  const [saving, setSaving] = useState(false)

  const startEdit = () => {
    setInputValue(idref?.value ?? '')
    setValidationError(null)
    setVerifying(false)
    setCanConfirm(false)
    setEdit(true)
  }

  const cancel = () => {
    setEdit(false)
    setVerifying(false)
    setCanConfirm(false)
    setValidationError(null)
  }

  const verify = () => {
    if (!person?.uid) return
    if (!IDREF_REGEX.test(inputValue.trim())) {
      setValidationError(t`idref_control_invalid_format`)
      return
    }
    setVerifyingValue(inputValue.trim().toUpperCase())
    setCanConfirm(false)
    setVerifying(true)
  }

  const save = async () => {
    if (!person?.uid) return
    setSaving(true)
    const result = await updatePersonIdentifier(
      person.uid,
      PersonIdentifierType.idref,
      verifyingValue,
    )
    setSaving(false)
    if (result.success) {
      setEdit(false)
      setVerifying(false)
      setSnackbar({
        open: true,
        success: true,
        messageId: 'idref_control_update_success',
      })
    } else {
      setSnackbar({
        open: true,
        success: false,
        messageId: 'idref_control_update_failure',
      })
    }
  }

  const remove = async () => {
    if (!person?.uid) return
    setOpenConfirm(false)
    const result = await removePersonIdentifier(
      person.uid,
      PersonIdentifierType.idref,
    )
    if (result.success) {
      setEdit(false)
      setSnackbar({
        open: true,
        success: true,
        messageId: 'idref_control_remove_success',
      })
    } else {
      setSnackbar({
        open: true,
        success: false,
        messageId: 'idref_control_remove_failure',
      })
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
        <Typography variant='subtitle1' fontWeight='bold'>
          IdRef
        </Typography>

        {!edit ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {idref && idrefUrl ? (
                <Link
                  href={idrefUrl}
                  target='_blank'
                  rel='noopener'
                  underline='hover'
                >
                  {idref.value}
                </Link>
              ) : (
                <Typography variant='body2' color='text.secondary'>
                  <Trans>idref_control_not_available</Trans>
                </Typography>
              )}
              {person && (
                <Can
                  I={PermissionAction.update}
                  a={person}
                  field='identifiers'
                  ability={ability}
                  passThrough
                >
                  {(allowed: boolean) => (
                    <Button
                      disabled={!allowed}
                      variant='outlined'
                      startIcon={<EditIcon />}
                      onClick={startEdit}
                      sx={{ minWidth: 'fit-content' }}
                    >
                      <Trans>idref_control_edit_button</Trans>
                    </Button>
                  )}
                </Can>
              )}
            </Box>
            {idref && <IdRefInfoBox idrefId={idref.value} />}
          </>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                setValidationError(null)
                if (verifying) {
                  setVerifying(false)
                  setCanConfirm(false)
                }
              }}
              error={!!validationError}
              helperText={validationError}
              label={t`idref_control_input_label`}
              size='small'
              inputProps={{ maxLength: 9 }}
              disabled={verifying}
            />

            {verifying && (
              <IdRefInfoBox
                idrefId={verifyingValue}
                forceOpen
                onReady={() => setCanConfirm(true)}
              />
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              {idref && !verifying && (
                <Button
                  color='error'
                  variant='outlined'
                  onClick={() => setOpenConfirm(true)}
                >
                  <Trans>idref_control_remove_button</Trans>
                </Button>
              )}
              <Button variant='outlined' onClick={cancel}>
                <Trans>edit_field_cancel_button_label</Trans>
              </Button>
              {!verifying ? (
                <Button variant='contained' disableElevation onClick={verify}>
                  <Trans>idref_control_verify_button</Trans>
                </Button>
              ) : (
                <Button
                  variant='contained'
                  disableElevation
                  disabled={!canConfirm || saving}
                  onClick={save}
                  startIcon={
                    saving ? (
                      <CircularProgress size={14} color='inherit' />
                    ) : undefined
                  }
                >
                  <Trans>idref_control_confirm_save</Trans>
                </Button>
              )}
            </Box>
          </Box>
        )}
      </Paper>

      <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)}>
        <DialogTitle>
          <Trans>idref_control_remove_dialog_title</Trans>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <Trans>idref_control_remove_dialog_text</Trans>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirm(false)}>
            <Trans>edit_field_cancel_button_label</Trans>
          </Button>
          <Button color='error' onClick={remove}>
            <Trans>idref_control_remove_dialog_confirm</Trans>
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar?.open ?? false}
        autoHideDuration={6000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(null)}
          severity={snackbar?.success ? 'success' : 'error'}
          sx={{ width: '100%' }}
        >
          {snackbar?.messageId === 'idref_control_update_success' && (
            <Trans>idref_control_update_success</Trans>
          )}
          {snackbar?.messageId === 'idref_control_update_failure' && (
            <Trans>idref_control_update_failure</Trans>
          )}
          {snackbar?.messageId === 'idref_control_remove_success' && (
            <Trans>idref_control_remove_success</Trans>
          )}
          {snackbar?.messageId === 'idref_control_remove_failure' && (
            <Trans>idref_control_remove_failure</Trans>
          )}
        </Alert>
      </Snackbar>
    </>
  )
}

export default IdrefControl
