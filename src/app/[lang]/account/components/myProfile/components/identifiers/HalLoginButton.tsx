'use client'

import { Button } from '@mui/material'
import Image from 'next/image'
import React from 'react'
import { Trans } from '@lingui/react'
import { getRuntimeEnv } from '@/utils/runtimeEnv'
import * as Lingui from '@lingui/core'

const buildCasLoginUrl = ({
  casUrl,
  baseUrl,
  renew,
}: {
  casUrl: string
  baseUrl: string
  renew?: boolean
}) => {
  if (!casUrl) throw new Error('Missing NEXT_PUBLIC_CAS_URL')
  if (!baseUrl) throw new Error('Missing NEXT_PUBLIC_BASE_URL')

  const normalizedCasUrl = casUrl.replace(/\/$/, '')
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')
  const lang = Lingui.i18n.locale
  const serviceUrl = `${normalizedBaseUrl}/api/cas/login?lang=${lang}`

  let loginUrl = `${normalizedCasUrl}/login?service=${encodeURIComponent(
    serviceUrl,
  )}`
  if (renew) loginUrl += '&renew=true'
  return loginUrl
}

export const HalLoginButton = ({ halProvided }: { halProvided: boolean }) => {
  const env = getRuntimeEnv()
  const casUrl = env.NEXT_PUBLIC_CAS_URL
  const baseUrl = env.NEXT_PUBLIC_BASE_URL

  const authUrl = buildCasLoginUrl({
    casUrl,
    baseUrl,
    renew: false,
  })

  return (
    <Button
      variant='outlined'
      href={authUrl}
      startIcon={
        <Image src='/icons/hal.png' alt='HAL logo' width={20} height={20} />
      }
      sx={{
        borderColor: '#1E88E5',
        color: '#2D3B45',
        textTransform: 'none',
        '&:hover': {
          borderColor: '#1E88E5',
          backgroundColor: 'rgba(30, 136, 229, 0.08)',
        },
      }}
    >
      {halProvided ? (
        <Trans id='hal_button_update_identifier' />
      ) : (
        <Trans id='hal_button_provide_identifier' />
      )}
    </Button>
  )
}
