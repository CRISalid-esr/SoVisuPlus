'use client'

import React, { useMemo, useState } from 'react'
import Image from 'next/image'
import {
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  Tooltip,
} from '@mui/material'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react'
import * as Lingui from '@lingui/core'
import { getRuntimeEnv } from '@/utils/runtimeEnv'
import { OrcidScope } from '@/types/OrcidIdentifier'

export function OrcidLoginButton({
  orcidProvided,
}: {
  orcidProvided: boolean
}) {
  const clientId = getRuntimeEnv().ORCID_CLIENT_ID
  const orcidURL = getRuntimeEnv().ORCID_URL
  const sovisuplusHost = getRuntimeEnv().NEXT_PUBLIC_BASE_URL
  const lang = Lingui.i18n.locale

  const HUMAN_LABELS: Record<string, string> = {
    '/read-limited': t`orcid_scope_read_limited`,
    '/person/update': t`orcid_scope_person_update`,
    '/activities/update': t`orcid_scope_activities_update`,
  }

  const configuredScopes = useMemo<OrcidScope[]>(() => {
    const raw = (getRuntimeEnv().ORCID_SCOPES ?? '').split(',')
    const list = raw.map((s) => s.trim()).filter(Boolean) as OrcidScope[]
    if (!list.includes('/authenticate')) list.unshift('/authenticate')
    return Array.from(new Set(list))
  }, [])

  // use effect to log configured scopes
  React.useEffect(() => {
    console.log('Configured ORCID scopes:', configuredScopes)
  }, [configuredScopes])

  // Exclude /authenticate from user checkboxes
  const optionalScopes = useMemo(
    () => configuredScopes.filter((s) => s !== '/authenticate'),
    [configuredScopes],
  )

  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    optionalScopes.reduce<Record<string, boolean>>((acc, s) => {
      acc[s] = true
      return acc
    }, {}),
  )

  const toggle = (scope: OrcidScope) =>
    setSelected((prev) => ({ ...prev, [scope]: !prev[scope] }))

  const redirectUri = React.useMemo(
    () =>
      encodeURIComponent(`${sovisuplusHost}/api/orcid/callback?lang=${lang}`),
    [sovisuplusHost, lang],
  )

  // Always include /authenticate + selected optionals
  const scopeParam = React.useMemo(() => {
    const chosen = [
      '/authenticate',
      ...optionalScopes.filter((s) => selected[s]),
    ]
    return chosen.join('%20')
  }, [optionalScopes, selected])

  const authUrl = React.useMemo(
    () =>
      `${orcidURL}/oauth/authorize?client_id=${clientId}` +
      `&response_type=code&scope=${encodeURIComponent(scopeParam)}` +
      `&redirect_uri=${redirectUri}`,
    [orcidURL, clientId, scopeParam, redirectUri],
  )

  return (
    <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap'>
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

      <Stack direction='row' spacing={1} alignItems='center' sx={{ ml: 1 }}>
        {optionalScopes.map((scope) => (
          <Tooltip key={scope} title={scope}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selected[scope]}
                  onChange={() => toggle(scope)}
                  size='small'
                />
              }
              label={HUMAN_LABELS[scope] ?? scope}
            />
          </Tooltip>
        ))}
      </Stack>
    </Stack>
  )
}
