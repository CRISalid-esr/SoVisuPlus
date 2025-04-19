'use client'

import { Button } from '@mui/material'
import Image from 'next/image'
import * as Lingui from '@lingui/core'
import { Trans } from '@lingui/react'
import React from 'react'

// <OrcidLoginButton orcidProvided={!!orcid} />
export function OrcidLoginButton({
  orcidProvided,
}: {
  orcidProvided: boolean
}) {
  const clientId = process.env.NEXT_PUBLIC_ORCID_CLIENT_ID
  const orcidURL = process.env.NEXT_PUBLIC_ORCID_URL
  const orcidScopes = process.env.NEXT_PUBLIC_ORCID_SCOPES
  const sovisuplusHost = process.env.NEXT_PUBLIC_SOVISUPLUS_HOST
  const lang = Lingui.i18n.locale
  const redirectUri = encodeURIComponent(
    `${sovisuplusHost}/api/orcid/callback?lang=${lang}`,
  )
  const scopes = encodeURIComponent(orcidScopes ?? '/authenticate')

  const authUrl = `${orcidURL}/oauth/authorize?client_id=${clientId}&response_type=code&scope=${scopes}&redirect_uri=${redirectUri}`

  return (
    <Button
      variant='outlined'
      href={authUrl}
      startIcon={
        <Image
          src='/icons/orcid-logo.png'
          alt='ORCID logo'
          width={20}
          height={20}
        />
      }
      sx={{
        borderColor: '#A6CE39',
        color: '#2D3B45',
        textTransform: 'none',
        '&:hover': {
          borderColor: '#A6CE39',
          backgroundColor: 'rgba(166, 206, 57, 0.1)',
        },
      }}
    >
      {orcidProvided ? (
        <Trans id='orcid_button_update_identifier' />
      ) : (
        <Trans id='orcid_button_provide_identifier' />
      )}
    </Button>
  )
}
