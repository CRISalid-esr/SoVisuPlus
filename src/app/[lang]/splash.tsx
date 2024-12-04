'use client'

import { Box, Button, Typography } from '@mui/material'
import { t } from '@lingui/macro'
import Logo from '@/public/logo_splash_screen.svg'
import Avatars from '@/public/avatars.svg'
import { signIn,  } from 'next-auth/react'
import Background from '@/public/background.svg'

export default function splash() {
  return (
    <>
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
              {t`splash.login`}
            </Button>
          </Box>
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
        <Typography
          variant='displayLarge'
          sx={(theme) => ({
            mb: theme.spacing(18),
            zIndex: 1,
          })}
        >
          Lorem Ipsum
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
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua.
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
        >
          <Avatars />
          <Typography
            variant='bodyLarge'
            component={'p'}
            sx={{
              lineHeight: 'normal',
            }}
          >
            Lorem ipsum dolor sit amet, consectetur adipiscing elit
          </Typography>
        </Box>
      </Box>
    </>
  )
}
