'use client'

import React, { useEffect } from 'react'
import Image from 'next/image'
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react'
import * as Lingui from '@lingui/core'
import { getRuntimeEnv } from '@/utils/runtimeEnv'
import { OrcidScope } from '@/types/OrcidIdentifier'

export const OrcidLoginButton = ({
  orcidProvided,
  grantedScopes,
  hasOauth,
}: {
  orcidProvided: boolean
  grantedScopes: OrcidScope[] | null
  hasOauth: boolean
}) => {
  const clientId = getRuntimeEnv().NEXT_PUBLIC_ORCID_CLIENT_ID
  const orcidURL = getRuntimeEnv().NEXT_PUBLIC_ORCID_URL
  const sovisuplusHost = getRuntimeEnv().NEXT_PUBLIC_BASE_URL
  const institutionName = getRuntimeEnv().NEXT_PUBLIC_INSTITUTION_NAME
  const lang = Lingui.i18n.locale

  const READ_LIMITED: OrcidScope = '/read-limited'

  const HUMAN_LABELS: Record<OrcidScope, string> = {
    '/read-limited': t`orcid_scope_read_limited`,
    '/person/update': t`orcid_scope_person_update`,
    '/activities/update': t`orcid_scope_activities_update`,
    '/authenticate': 'authenticate', // never shown; required for typing
  }

  const PERMISSION_TEXT_BY_SCOPE: Partial<Record<OrcidScope, JSX.Element>> = {
    '/read-limited': <Trans id='orcid_permission_read_limited' />,
    '/activities/update': <Trans id='orcid_permission_activities_update' />,
    '/person/update': <Trans id='orcid_permission_person_update' />,
  }

  const TOOLTIP_SCOPE_LABEL: Partial<Record<OrcidScope, string>> = {
    '/read-limited': t`orcid_scope_read_limited_tooltip`,
    '/activities/update': t`orcid_scope_person_update_tooltip`,
    '/person/update': t`orcid_scope_activities_update_tooltip`,
    '/authenticate': t`authenticate_tooltip`,
  }

  const configuredScopes = React.useMemo<OrcidScope[]>(() => {
    const raw = (getRuntimeEnv().NEXT_PUBLIC_ORCID_SCOPES ?? '').split(',')
    const list = raw.map((s) => s.trim()).filter(Boolean) as OrcidScope[]
    // Always include /authenticate
    if (!list.includes('/authenticate')) list.unshift('/authenticate')
    return Array.from(new Set(list))
  }, [])

  const optionalScopes = React.useMemo(
    () => configuredScopes.filter((s) => s !== '/authenticate'),
    [configuredScopes],
  )

  // Initial selection:
  // - linked => reflect granted scopes
  // - not linked => default all checked
  const [selected, setSelected] = React.useState<Record<OrcidScope, boolean>>(
    () => {
      const base = Object.fromEntries(
        optionalScopes.map((s) => [s, true]),
      ) as Record<OrcidScope, boolean>
      if (grantedScopes?.length) {
        for (const s of optionalScopes) base[s] = grantedScopes.includes(s)
      }
      return base
    },
  )

  // Sync when grantedScopes arrives/changes (e.g. after refresh)
  useEffect(() => {
    if (!grantedScopes) return
    setSelected((prev) => {
      const next = { ...prev }
      for (const s of optionalScopes) next[s] = grantedScopes.includes(s)
      return next
    })
  }, [grantedScopes, optionalScopes])

  const anyOtherChecked = React.useMemo(
    () =>
      optionalScopes.some((s) => s !== READ_LIMITED && Boolean(selected[s])),
    [optionalScopes, selected],
  )

  const toggle = (scope: OrcidScope) =>
    setSelected((prev) => {
      const next = { ...prev, [scope]: !prev[scope] }

      // If any non-read-limited is checked, force read-limited checked
      const hasNonRead = optionalScopes.some(
        (s) => s !== READ_LIMITED && Boolean(next[s]),
      )
      if (hasNonRead) next[READ_LIMITED] = true

      return next
    })

  const redirectUri = React.useMemo(
    () =>
      encodeURIComponent(`${sovisuplusHost}/api/orcid/callback?lang=${lang}`),
    [sovisuplusHost, lang],
  )

  const scopeParam = React.useMemo(() => {
    const chosen: OrcidScope[] = [
      '/authenticate',
      ...optionalScopes.filter((s) => selected[s]),
    ]
    return chosen.join(' ')
  }, [optionalScopes, selected])

  const authUrl = React.useMemo(
    () =>
      `${orcidURL}/oauth/authorize?client_id=${clientId}` +
      `&response_type=code&scope=${encodeURIComponent(scopeParam)}` +
      `&redirect_uri=${redirectUri}`,
    [orcidURL, clientId, scopeParam, redirectUri],
  )

  const grantedPermissionBullets = React.useMemo(() => {
    if (!grantedScopes?.length) return []
    return grantedScopes
      .filter((s) => s !== '/authenticate')
      .filter((s) => Boolean(PERMISSION_TEXT_BY_SCOPE[s]))
      .map((s) => ({ scope: s, text: PERMISSION_TEXT_BY_SCOPE[s]! }))
  }, [grantedScopes])

  const PermissionsBox = (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'action.hover',
        borderRadius: 2,
        px: 1.5,
        py: 1,
        maxWidth: '100%',
        minWidth: 0,
      }}
    >
      {hasOauth && grantedPermissionBullets.length > 0 ? (
        <Stack spacing={0.5}>
          <Typography variant='body2'>
            <Trans id='orcid_permissions_intro' values={{ institutionName }} />
          </Typography>

          <List dense sx={{ py: 0, pl: 1.5 }}>
            {grantedPermissionBullets.map((b) => (
              <ListItem
                key={b.scope}
                sx={{ py: 0, display: 'list-item', listStyleType: 'disc' }}
              >
                <ListItemText primary={b.text} />
              </ListItem>
            ))}
          </List>
        </Stack>
      ) : (
        <Typography variant='body2'>
          <Trans id='orcid_permissions_none' values={{ institutionName }} />
        </Typography>
      )}
    </Box>
  )

  const ControlsRow = (
    <Stack
      direction='row'
      spacing={2}
      alignItems='flex-start'
      flexWrap='wrap'
      sx={{ minWidth: 0, maxWidth: '100%' }}
    >
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

      <Stack
        direction='row'
        spacing={1}
        alignItems='center'
        flexWrap='wrap'
        sx={{ minWidth: 0, maxWidth: '100%' }}
      >
        {optionalScopes.map((scope) => (
          <Tooltip key={scope} title={TOOLTIP_SCOPE_LABEL[scope] ?? scope}>
            <FormControlLabel
              sx={{
                mr: 0.5,
                maxWidth: '100%',
                '& .MuiFormControlLabel-label': {
                  whiteSpace: 'normal',
                  overflowWrap: 'anywhere',
                },
              }}
              control={
                <Checkbox
                  checked={Boolean(selected[scope])}
                  onChange={() => toggle(scope)}
                  size='small'
                  disabled={scope === READ_LIMITED && anyOtherChecked}
                />
              }
              label={HUMAN_LABELS[scope] ?? scope}
            />
          </Tooltip>
        ))}
      </Stack>
    </Stack>
  )

  return (
    <Stack spacing={1.25} sx={{ minWidth: 0, maxWidth: '100%' }}>
      <>
        {PermissionsBox}
        {ControlsRow}
      </>
    </Stack>
  )
}
