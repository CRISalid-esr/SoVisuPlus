'use client'

import { Box, Button, Typography } from '@mui/material'
import { t } from '@lingui/macro'
import Image from 'next/image'
import { signIn } from 'next-auth/react'
import { useTheme } from '@mui/material/styles'
import { Link } from '@mui/material'

import Logo from '@/public/theme/splash_header_logo.svg'
import Background from '@/public/theme/splash_background.svg'
import CrisalidLogo from '@/public/theme/splash_footer_logo.png'
import SplashPreview from '@/public/theme/splash_preview.png'

export default function Splash() {
  const theme = useTheme()

  return (
    <>
      <Box flex={{ xs: 1, md: 1 }} display='flex' flexDirection='column'>
        <Box p={6}>
          <Logo />
        </Box>

        <Box
          flex={1}
          display='flex'
          flexDirection='column'
          justifyContent='center'
          alignItems='center'
          px={15}
          pb={21}
        >
          <Image
            src={SplashPreview}
            alt='SoVisuPlus preview screenshot'
            width={478}
            height={236}
            style={{
              boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25)',
              marginBottom: '3.5rem',
            }}
          />

          <Typography
            component='p'
            variant='headingSmall'
            mb={7}
            align='center'
            color={theme.palette.primary.main}
            fontWeight='bold'
          >
            Scientific Output Visualization
          </Typography>

          <Button
            onClick={() => signIn('keycloak')}
            fullWidth
            variant='contained'
            sx={{
              maxWidth: '30rem',
            }}
          >
            {t`splash.login`}
          </Button>
        </Box>

        <Box pl={6} pr={3} py={2} display='flex' justifyContent='space-between'>
          <Box>
            <Image
              src={CrisalidLogo}
              alt='CRISalid logo'
              width={150}
              height={45}
            />
          </Box>

          <Box display='flex' gap={3} alignItems='center' pb={1}>
            <Link href='#' underline='none' fontWeight='bold'>
              À propos
            </Link>
            <Link href='#' underline='none' fontWeight='bold'>
              Mentions légales
            </Link>
            <Link href='#' underline='none' fontWeight='bold'>
              Accessibilité
            </Link>
            <Link href='#' underline='none' fontWeight='bold'>
              Communauté
            </Link>
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
          py={21}
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
            justifyContent='center'
            flex={2}
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
