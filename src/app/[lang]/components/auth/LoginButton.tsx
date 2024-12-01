'use client'

import { t, Trans } from '@lingui/macro'
import { signIn } from 'next-auth/react'
import { Button } from '@mui/material'

export default function LoginButton() {
  return (
    <Button
      variant='contained'
      color='primary'
      aria-label={t`login_button_label`}
      onClick={() => signIn('keycloak')}
    >
      <Trans>login_button_label</Trans>
    </Button>
  )
}
