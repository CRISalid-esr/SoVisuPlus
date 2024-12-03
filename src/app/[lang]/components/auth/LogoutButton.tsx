'use client'

import { t, Trans } from '@lingui/macro'
import { Button } from '@mui/material'
import { signOut } from 'next-auth/react'

export default function LogoutButton() {
  return (
    <Button
      variant='contained'
      color='primary'
      aria-label={t`logout_button_label`}
      onClick={() => signOut()}
    >
      <Trans>logout_button_label</Trans>
    </Button>
  )
}
