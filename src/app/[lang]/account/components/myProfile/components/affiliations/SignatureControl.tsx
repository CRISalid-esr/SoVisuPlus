'use client'
import { IconButton, Paper, Snackbar, Typography } from '@mui/material'
import useStore from '@/stores/global_store'
import { Trans } from '@lingui/react'
import { useState } from 'react'
import { ContentCopy } from '@mui/icons-material'

export default function SignatureControl() {
  const { connectedUser } = useStore((state) => state.user)
  const person = connectedUser?.person
  const signatures = person?.membershipSignatures ?? []
  const [open, setOpen] = useState<boolean>(false)

  const handleCopy = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(signatures.join())
        setOpen(true)
      } catch (err) {
        console.error('Failed to copy!', err)
      }
    } else {
      console.warn('Clipboard API not available')
    }
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
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
      <Typography variant='subtitle1' fontWeight='bold'>
        <Trans id='profile_affiliations_signature_label' />
      </Typography>
      <Typography key='signatures' variant='body2' color='text.secondary'>
        {signatures.join()}
      </Typography>
      <IconButton onClick={handleCopy}>
        <ContentCopy sx={open ? { color: 'black' } : { color: 'inherit' }} />
      </IconButton>
      <Snackbar
        open={open}
        autoHideDuration={3000}
        message={
          <Trans
            id={'profile_affiliations_signature_copied_message_confirmation'}
          />
        }
        onClose={handleClose}
      />
    </Paper>
  )
}
