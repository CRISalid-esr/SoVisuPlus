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
import { contentCenteredSnackbarSx } from '@/app/[lang]/components/contentCenteredSnackbarSx'

interface ValidateIdentifierButtonProps {
  personUid: string
  type: PersonIdentifierType
  /** Whether the button is shown; the component stays mounted to keep its feedback */
  show: boolean
}

// Validates an existing identifier without authenticating it, after confirmation
const ValidateIdentifierButton = ({
  personUid,
  type,
  show,
}: ValidateIdentifierButtonProps) => {
  const { validatePersonIdentifier } = useStore((s) => s.user)
  const [openConfirm, setOpenConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  // Kept on close so the message does not change during the exit transition
  const [feedback, setFeedback] = useState({ open: false, success: false })

  const validate = async () => {
    setOpenConfirm(false)
    setSaving(true)
    const { success } = await validatePersonIdentifier(personUid, type)
    setSaving(false)
    setFeedback({ open: true, success })
  }

  return (
    <>
      {show && (
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
      )}

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
        open={feedback.open}
        autoHideDuration={6000}
        onClose={() => setFeedback((f) => ({ ...f, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={contentCenteredSnackbarSx}
      >
        <Alert
          onClose={() => setFeedback((f) => ({ ...f, open: false }))}
          severity={feedback.success ? 'success' : 'error'}
          sx={{ width: '100%' }}
        >
          {feedback.success ? (
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
