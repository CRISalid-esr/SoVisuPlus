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
import { contentCenteredSnackbarSx } from '@/app/[lang]/components/contentCenteredSnackbarSx'

interface ValidateProfileButtonProps {
  personUid: string
  /** Whether the button is shown; the component stays mounted to keep its feedback */
  show: boolean
}

// Marks the profile as validated, after confirmation
const ValidateProfileButton = ({
  personUid,
  show,
}: ValidateProfileButtonProps) => {
  const { validatePersonProfile } = useStore((s) => s.user)
  const [openConfirm, setOpenConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  // Kept on close so the message does not change during the exit transition
  const [feedback, setFeedback] = useState({ open: false, success: false })

  const validate = async () => {
    setOpenConfirm(false)
    setSaving(true)
    const { success } = await validatePersonProfile(personUid)
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
          sx={{ minWidth: 'fit-content' }}
        >
          <Trans>profile_validate_button</Trans>
        </Button>
      )}

      <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)}>
        <DialogTitle>
          <Trans>profile_validate_dialog_title</Trans>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <Trans>profile_validate_dialog_text</Trans>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirm(false)}>
            <Trans>identifier_dialog_cancel_button</Trans>
          </Button>
          <Button color='success' onClick={validate}>
            <Trans>profile_validate_dialog_confirm</Trans>
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
            <Trans>profile_validate_success</Trans>
          ) : (
            <Trans>profile_validate_failure</Trans>
          )}
        </Alert>
      </Snackbar>
    </>
  )
}

export default ValidateProfileButton
