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

export default function Splash() {
  const lang = Lingui.i18n.locale || 'fr'
  const [locales, setLocales] = useState<ThemeLocales>()
  const theme = useTheme()

  useEffect(() => {
    async function importLocales() {
      try {
        const importedLocales = await import(
          `@/public/theme/locales_${lang}.json`
        )

        setLocales(importedLocales.default)
      } catch {
        throw new Error('Theme locales could not be imported')
      }
    }

    importLocales()
  }, [lang])

  return (
    <>
      <Box flex={1} display='flex' flexDirection='column'>
        <Box p={{ xs: 2, md: 6 }}>
          <Logo />
        </Box>

        <Box
          flex={1}
          display='flex'
          flexDirection='column'
          justifyContent='center'
          alignItems='center'
          px={{ xs: 2, md: 15 }}
          pb={{ xs: 3, md: 21 }}
        >
          <Box
            position='relative'
            width={{ xs: '100%', md: 478 }}
            height={236}
            mb={7}
          >
            <Image
              src={SplashPreview}
              alt='SoVisuPlus preview screenshot'
              fill
              style={{
                boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25)',
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

        <Box
          pl={{ xs: 2, md: 6 }}
          pr={{ xs: 2, md: 3 }}
          py={2}
          display='flex'
          justifyContent='space-between'
        >
          <Box>
            <Image
              src={CrisalidLogo}
              alt='CRISalid logo'
              width={150}
              height={45}
            />
          </Box>

          <Box
            display='flex'
            gap={3}
            alignItems={{ xs: 'flex-end', md: 'center' }}
            pb={1}
            flexDirection={{ xs: 'column', md: 'row' }}
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
