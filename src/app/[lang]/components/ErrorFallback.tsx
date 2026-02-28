'use client'

import Background from '@/public/icons/background.svg'
import Error500 from '@/public/icons/error500.svg'
import Logo from '@/public/icons/logo_splash_screen.svg'
import { Trans } from '@lingui/react'
import { Box, Button, Typography } from '@mui/material'
import { usePathname, useRouter } from 'next/navigation'

const ErrorFallback = () => {
  const pathname = usePathname() // Get the current path
  const lang = pathname.split('/')[1] // Extract the `lang` dynamic segment
  const router = useRouter()

  return (
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
              onClick={() => router.push(`/${lang}/dashboard`)}
              fullWidth
              variant='contained'
              sx={{
                textTransform: 'none',
                backgroundColor: 'teal',
                mb: 10,
                '&:hover': { backgroundColor: 'darkcyan' },
              }}
            >
              <Trans id='internal_server_page_back_home' />
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
          <Error500 />
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
              mb: theme.spacing(4),
              zIndex: 1,
              textAlign: 'start',
            })}
          >
            500
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
              sx={() => ({
                zIndex: 1,
              })}
            >
              <Trans id='internal_server_page_description' />
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
  )
}

export default ErrorFallback
