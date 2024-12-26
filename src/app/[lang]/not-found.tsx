'use client'

import ErrorBoundary from '@/components/ErrorBoundary'
import ErrorFallback from '@/components/ErrorFallback'
import Background from '@/public/icons/background.svg'
import Error404 from '@/public/icons/error404.svg'
import Logo from '@/public/icons/logo_splash_screen.svg'
import { Trans } from '@lingui/macro'
import { Box, Button, Typography } from '@mui/material'
import { signIn } from 'next-auth/react'

const NotFound = () => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Box display='flex' flexDirection='row' height='100vh' width='100vw'>
        <Box flex={{ xs: 1, md: 1 }}>
          <Box
            sx={(theme) => ({
              padding: theme.spacing(6),
            })}
          >
            <Logo />
          </Box>
          <Box display='flex' justifyContent='center' alignItems='center'>
            <Box width='100%' maxWidth='400px'>
              <Button
                onClick={() => signIn('keycloak')}
                fullWidth
                variant='contained'
                sx={{
                  backgroundColor: 'teal',
                  mb: 2,
                  '&:hover': { backgroundColor: 'darkcyan' },
                }}
              >
                <Trans>notfound_page_back_home</Trans>
              </Button>
            </Box>
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Error404 />
          </Box>
        </Box>
        <Box
          flex={1}
          display={{ xs: 'none', md: 'flex' }} // Hide on small screens
          justifyContent='center'
          alignItems='center'
          flexDirection='column'
          p={4}
          bgcolor='teal'
          color='white'
          position={'relative'}
          sx={{
            zIndex: 0,
            overflow: 'hidden',
          }}
        >
          <Background
            style={{
              position: 'absolute',
              zIndex: -1,
            }}
          />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'start',
              flexDirection: 'column',
            }}
          >
            <Typography
              variant='displayLarge'
              sx={(theme) => ({
                mb: theme.spacing(18),
                zIndex: 1,
                textAlign: 'start',
              })}
            >
              404
            </Typography>
            <Box
              sx={{
                maxWidth: '478.543px',
                position: 'relative',
              }}
            >
              <Typography
                component={'p'}
                variant='headingSmall'
                sx={(theme) => ({
                  mb: theme.spacing(18),
                  zIndex: 1,
                })}
              >
                <Trans>notfound_page_description</Trans>
              </Typography>
            </Box>
            <Box
              sx={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            ></Box>
          </Box>
        </Box>
      </Box>
    </ErrorBoundary>
  )
}

export default NotFound
