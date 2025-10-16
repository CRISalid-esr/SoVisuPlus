'use client'

import { useEffect, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { t } from '@lingui/macro'
import Image from 'next/image'
import { signIn } from 'next-auth/react'
import { useTheme } from '@mui/material/styles'
import { Link } from '@mui/material'
import * as Lingui from '@lingui/core'

import Logo from '@/public/theme/splash_header_logo.svg'
import Background from '@/public/theme/splash_background.svg'
import CrisalidLogo from '@/public/theme/splash_footer_logo.png'
import SplashPreview from '@/public/theme/splash_preview.png'
import { ThemeLocales } from '@/types/ThemeLocales'
import LocalesFr from '@/public/theme/locales_fr.json'
import LocalesEn from '@/public/theme/locales_en.json'

export default function Splash() {
  const lang = Lingui.i18n.locale || 'fr'
  const [locales, setLocales] = useState<ThemeLocales>()
  const theme = useTheme()

  useEffect(() => {
    setLocales(lang === 'en' ? LocalesEn : LocalesFr)
  }, [lang])

  return (
    <>
      <Box flex={1} display='flex'>
        <Box
          flex={1}
          display='flex'
          flexDirection='column'
          pl={{ xs: 2, lg: 5 }}
          pr={{ xs: 2, lg: 2 }}
          pt={{ xs: 2, md: 6 }}
          pb={2}
        >
          <Box>
            <Logo />
          </Box>

          <Box
            flex={1}
            display='flex'
            flexDirection='column'
            justifyContent='center'
            alignItems='center'
          >
            <Box mb={7}>
              <Image
                src={SplashPreview}
                alt='SoVisuPlus preview screenshot'
                style={{
                  boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25)',
                  height: 'auto',
                  maxHeight: '236px',
                  maxWidth: '100%',
                  width: 'auto',
                }}
              />
            </Box>

            <Typography
              component='p'
              variant='headingSmall'
              mb={7}
              align='center'
              color={theme.palette.primary.main}
              fontWeight='bold'
            >
              {locales?.previewLegend}
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

          <Box display='flex' justifyContent='space-between'>
            <Box
              display='flex'
              flexDirection={{ xs: 'column', lg: 'row' }}
              justifyContent={{
                xs: 'flex-end',
                lg: 'flex-start',
              }}
            >
              <Image
                src={CrisalidLogo}
                alt='CRISalid logo'
                width={150}
                height={45}
              />
            </Box>

            <Box
              display='flex'
              gap={2.25}
              alignItems={{ xs: 'flex-end', lg: 'center' }}
              pb={{ xs: 2, md: 0 }}
              flexDirection={{ xs: 'column', lg: 'row' }}
              textAlign='right'
            >
              <Link href='#' underline='none' fontWeight='bold'>
                {t`splash.about`}
              </Link>
              <Link href='#' underline='none' fontWeight='bold'>
                {t`splash.legal_mentions`}
              </Link>
              <Link href='#' underline='none' fontWeight='bold'>
                {t`splash.accessibility`}
              </Link>
              <Link href='#' underline='none' fontWeight='bold'>
                {t`splash.community`}
              </Link>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box flex={1} display={{ xs: 'none', md: 'flex' }}>
        <Box
          display='flex'
          flex={1}
          alignItems='center'
          justifyContent='center'
          flexDirection='column'
          px={{ md: 6, lg: 15 }}
          py={{ md: 6, lg: 21 }}
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
          >
            <Typography component='h1' variant='displayLarge' mb={5}>
              {locales?.header}
            </Typography>

            <Typography component='p' variant='headingSmall' mb={3}>
              {locales?.firstParagraph}
            </Typography>

            <Typography component='p' variant='headingSmall'>
              {locales?.secondParagraph}
            </Typography>
          </Box>
        </Box>
      </Box>
    </>
  )
}
