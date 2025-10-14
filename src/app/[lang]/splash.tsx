'use client'

import { Box, Button, Typography } from '@mui/material'
import { t } from '@lingui/macro'
import { signIn } from 'next-auth/react'

import Logo from '@/public/icons/logo_splash_screen.svg'
import Background from '@/public/icons/background.svg'

export default function splash() {
  return (
    <>
      <Box flex={{ xs: 1, md: 1 }}>
        <Box p={6}>
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

      <Box flex={1} display={{ xs: 'none', md: 'flex' }}>
        <Box
          display='flex'
          flex={1}
          alignItems='center'
          flexDirection='column'
          px={15}
          py={24}
          bgcolor='teal'
          color='white'
          position='relative'
          zIndex={0}
          overflow='hidden'
        >
          <Background
            style={{
              position: 'absolute',
              zIndex: -1,
            }}
          />

          <Box
            maxWidth='60ch'
            display='flex'
            flexDirection='column'
            justifyContent='flex-end'
            flex={1}
          >
            <Typography component='h1' variant='displayLarge' mb={5}>
              Prenez le contrôle de l’empreinte numérique de vos recherches
            </Typography>

            <Typography component='p' variant='headingSmall' mb={3}>
              SoVisu+ vous aide à centraliser et qualifier vos données,
              visualiser vos activités de recherche et mettre en avant vos
              expertises.
            </Typography>

            <Typography component='p' variant='headingSmall'>
              Un outil conçu par et pour les enseignants-chercheurs pour vous
              aider à améliorer la visibilité de vos travaux, de la
              visualisation à l’action.
            </Typography>
          </Box>
        </Box>
      </Box>
    </>
  )
}
