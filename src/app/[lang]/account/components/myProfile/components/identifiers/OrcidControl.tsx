import useStore from '@/stores/global_store'
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Alert,
  Box,
  Link,
  Paper,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material'
import { PidComponent } from '@kit-data-manager/react-pid-component'
import styles from './OrcidControl.module.css'
import { OrcidLoginButton } from '@/app/[lang]/account/components/myProfile/components/identifiers/OrcidLoginButton'
import { Trans } from '@lingui/react'
import { ORCIDIdentifier } from '@/types/OrcidIdentifier'
import LinkIcon from '@mui/icons-material/Link'
import { PersonIdentifierType as DbPersonIdentifierType } from '@prisma/client'
import { isPerson } from '@/types/Person'
import { useSession } from 'next-auth/react'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'

const OrcidControl = () => {
  const { connectedUser, currentPerspective, ownPerspective } = useStore(
    (state) => state.user,
  )
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const ability = useMemo(
    () => abilityFromAuthzContext(session?.user?.authz),
    [session?.user?.authz],
  )

  // Auth controls (OrcidLoginButton) are shown only when the user is viewing their
  // own account AND holds an identifier-update permission on their own person.
  // Wide-scoped editors viewing other people's accounts always get the read-only view.
  const canAuthenticate = useMemo(
    () =>
      ownPerspective &&
      !!connectedUser?.person &&
      ability.can(PermissionAction.update, connectedUser.person, 'identifiers'),
    [ownPerspective, connectedUser?.person, ability],
  )
  const [open, setOpen] = useState(false)
  const [severity, setSeverity] = useState<'success' | 'error'>('success')
  const [messageKey, setMessageKey] = useState<string | null>(null)

  // When viewing another person's account, read their identifiers from currentPerspective
  const person =
    ownPerspective || !currentPerspective || !isPerson(currentPerspective)
      ? connectedUser?.person
      : currentPerspective

  const identifiers = person?.getIdentifiers() ?? []
  const orcidIdentifier = identifiers.find(
    (i) => i.type === DbPersonIdentifierType.orcid,
  ) as ORCIDIdentifier | undefined

  const orcid = orcidIdentifier?.value
  const isLinked = Boolean(orcidIdentifier?.oauth)

  useEffect(() => {
    if (!ownPerspective) return
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success && !success.startsWith('orcid_')) return
    if (error && !error.startsWith('orcid_')) return

    if (success) {
      setSeverity('success')
      setMessageKey(success)
      setOpen(true)
    } else if (error) {
      setSeverity('error')
      setMessageKey(error)
      setOpen(true)
    }
  }, [searchParams, ownPerspective])

  // Read-only view: no auth controls if not own perspective or no permission
  if (!canAuthenticate) {
    return (
      <Paper
        elevation={1}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          p: 2,
          width: '100%',
          borderRadius: 2,
          minWidth: 0,
        }}
      >
        <Typography variant='subtitle1' fontWeight='bold'>
          ORCID
        </Typography>
        {orcid ? (
          <>
            {/* Mobile / tablet */}
            <Box
              sx={{
                display: { xs: 'inline-flex', lg: 'none' },
                alignItems: 'center',
                gap: 1,
                px: 1.25,
                py: 0.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'action.hover',
                maxWidth: '100%',
                minWidth: 0,
              }}
            >
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ lineHeight: 1 }}
              >
                ORCID
              </Typography>
              <Typography
                variant='body2'
                sx={{
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                  minWidth: 0,
                }}
              >
                {orcid}
              </Typography>
            </Box>
            {/* Desktop */}
            <Box sx={{ display: { xs: 'none', lg: 'block' }, minWidth: 0 }}>
              <PidComponent
                value={orcid}
                emphasizeComponent={true}
                className={styles['pid-components']}
              />
            </Box>
          </>
        ) : (
          <Typography variant='body2' color='text.secondary'>
            <Trans id='orcid_identifier_no_orcid_provided' />
          </Typography>
        )}
      </Paper>
    )
  }

  const handleClose = () => {
    setOpen(false)
    const url = new URL(window.location.href)
    url.searchParams.delete('success')
    url.searchParams.delete('error')
    router.replace(url.pathname, { scroll: false })
  }

  const renderMessage = () => {
    switch (messageKey) {
      case 'orcid_authentication_success':
        return <Trans id='orcid_authentication_success' />
      case 'orcid_authentication_failure':
        return <Trans id='orcid_authentication_failure' />
      case 'orcid_authentication_failure_no_code':
        return <Trans id={'orcid_authentication_failure_no_code'} />
      case 'orcid_authentication_failure_no_session':
        return <Trans id={'orcid_authentication_failure_no_session'} />
      case 'orcid_authentication_failure_user_not_found':
        return <Trans id={'orcid_authentication_failure_user_not_found'} />
      case 'orcid_insert_failure':
        return <Trans id={'orcid_insert_failure'} />
      default:
        return null
    }
  }

  return (
    <>
      <Paper
        elevation={1}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          p: 2,
          width: '100%',
          borderRadius: 2,
          minWidth: 0,
        }}
      >
        {/* Header row: label + linked icon */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            minWidth: 0,
          }}
        >
          <Typography variant='subtitle1' fontWeight='bold'>
            ORCID
          </Typography>

          {isLinked && (
            <Tooltip title={<Trans id='orcid_account_linked_tooltip' />} arrow>
              <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                <LinkIcon fontSize='small' />
              </Box>
            </Tooltip>
          )}
        </Box>

        {/* 1) PID row */}
        {orcid ? (
          <>
            {/* Mobile / tablet : hide PidComponent */}
            <Box
              sx={{
                display: { xs: 'inline-flex', lg: 'none' },
                alignItems: 'center',
                gap: 1,
                px: 1.25,
                py: 0.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'action.hover',
                maxWidth: '100%',
                minWidth: 0,
              }}
            >
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ lineHeight: 1 }}
              >
                ORCID
              </Typography>

              <Typography
                variant='body2'
                sx={{
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                  minWidth: 0,
                }}
              >
                {orcid}
              </Typography>
            </Box>

            {/* Desktop : show PidComponent */}
            <Box
              sx={{
                display: { xs: 'none', lg: 'block' },
                minWidth: 0,
              }}
            >
              <PidComponent
                value={orcid}
                emphasizeComponent={true}
                className={styles['pid-components']}
              />
            </Box>
          </>
        ) : (
          <Typography variant='body2' color='text.secondary'>
            <Trans id='orcid_identifier_no_orcid_provided' />
          </Typography>
        )}

        {/* 2) + 3): authorisation text then button+checkboxes */}
        <OrcidLoginButton
          orcidProvided={!!orcid}
          grantedScopes={orcidIdentifier?.oauth?.scope ?? null}
          hasOauth={isLinked}
        />

        {/* Helper text */}
        <Typography variant='caption' color='text.secondary'>
          <Trans
            id='orcid_control_helper'
            components={[
              <Link
                key='orcid-link'
                href='https://orcid.org'
                target='_blank'
                rel='noopener noreferrer'
                underline='always'
              />,
            ]}
          />
        </Typography>
      </Paper>

      <Snackbar
        open={open}
        autoHideDuration={6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleClose} severity={severity} sx={{ width: '100%' }}>
          {renderMessage()}
        </Alert>
      </Snackbar>
    </>
  )
}
export default OrcidControl
