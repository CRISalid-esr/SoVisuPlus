'use client'

import { useState } from 'react'
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
} from '@mui/material'
import { Trans } from '@lingui/react/macro'
import useStore from '@/stores/global_store'
import { PersonIdentifierType } from '@/types/PersonIdentifier'

interface ValidateIdentifierButtonProps {
  personUid: string
  type: PersonIdentifierType
}

// Validates an existing identifier without authenticating it, after confirmation
const ValidateIdentifierButton = ({
  personUid,
  type,
}: ValidateIdentifierButtonProps) => {
  const { validatePersonIdentifier } = useStore((s) => s.user)
  const [openConfirm, setOpenConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<boolean | null>(null)

  const validate = async () => {
    setOpenConfirm(false)
    setSaving(true)
    const { success } = await validatePersonIdentifier(personUid, type)
    setSaving(false)
    setResult(success)
  }

  return (
    <>
      <Button
        color='success'
        variant='outlined'
        onClick={() => setOpenConfirm(true)}
        disabled={saving}
        startIcon={
          saving ? <CircularProgress size={14} color='inherit' /> : undefined
        }
        sx={{ minWidth: 'fit-content', alignSelf: 'flex-start' }}
      >
        <Trans>identifier_validate_button</Trans>
      </Button>

      <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)}>
        <DialogTitle>
          <Trans>identifier_validate_dialog_title</Trans>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <Trans>identifier_validate_dialog_text</Trans>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirm(false)}>
            <Trans>identifier_dialog_cancel_button</Trans>
          </Button>
          <Button color='success' onClick={validate}>
            <Trans>identifier_validate_dialog_confirm</Trans>
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={result !== null}
        autoHideDuration={6000}
        onClose={() => setResult(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setResult(null)}
          severity={result ? 'success' : 'error'}
          sx={{ width: '100%' }}
        >
          {result ? (
            <Trans>identifier_validate_success</Trans>
          ) : (
            <Trans>identifier_validate_failure</Trans>
          )}
        </Alert>
      </Snackbar>
    </>
  )
}

export default ValidateIdentifierButton
