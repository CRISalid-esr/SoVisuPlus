import useStore from '@/stores/global_store'
import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Alert, Paper, Snackbar, Typography } from '@mui/material'
import { PersonIdentifierType } from '@/types/PersonIdentifier'
import { PidComponent } from '@kit-data-manager/react-pid-component'
import styles from './OrcidControl.module.css'
import { OrcidLoginButton } from '@/app/[lang]/account/components/myProfile/components/identifiers/OrciLoginButton'
import { Trans } from '@lingui/react'

export default function OrcidControl() {
  const { connectedUser } = useStore((state) => state.user)
  const person = connectedUser?.person
  const identifiers = person?.getIdentifiers() ?? []
  const orcid = identifiers.find(
    (identifier) => identifier.type === PersonIdentifierType.ORCID,
  )?.value

  const searchParams = useSearchParams()
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [severity, setSeverity] = useState<'success' | 'error'>('success')
  const [messageKey, setMessageKey] = useState<string | null>(null)

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success) {
      setSeverity('success')
      setMessageKey(success)
      setOpen(true)
    } else if (error) {
      setSeverity('error')
      setMessageKey(error)
      setOpen(true)
    }
  }, [searchParams])

  const handleClose = () => {
    setOpen(false)
    const url = new URL(window.location.href)
    url.searchParams.delete('success')
    url.searchParams.delete('error')
    router.replace(url.pathname, { scroll: false })
  }

  const renderMessage = () => {
    switch (messageKey) {
      case 'orcid-authentication-success':
        return <Trans id='orcid-authentication-success' />
      case 'orcid-authentication-failure':
        return <Trans id='orcid-authentication-failure' />
      case 'orcid-authentication-failure-no-code':
        return <Trans id={'orcid-authentication-failure-no-code'} />
      case 'orcid-authentication-failure-no-session':
        return <Trans id={'orcid-authentication-failure-no-session'} />
      case 'orcid-authentication-failure-user-not-found':
        return <Trans id={'orcid-authentication-failure-user-not-found'} />
      case 'orcid-insert-failure':
        return <Trans id={'orcid-insert-failure'} />
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
          alignItems: 'end',
          gap: 2,
          p: 2,
          width: '100%',
          borderRadius: 2,
        }}
      >
        <Typography
          variant='subtitle1'
          fontWeight='bold'
          sx={{ alignSelf: 'normal' }}
        >
          ORCID
        </Typography>
        {orcid && (
          <PidComponent
            value={orcid}
            emphasizeComponent={true}
            className={styles['pid-components']}
          />
        )}
        {!orcid && (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ alignSelf: 'normal' }}
          >
            <Trans id='orcid_identifier_no_orcid_provided' />
          </Typography>
        )}
        <OrcidLoginButton orcidProvided={!!orcid} />
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
