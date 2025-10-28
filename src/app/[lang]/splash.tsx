'use client'

import { t } from '@lingui/core/macro'
import { useEffect, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { signIn } from 'next-auth/react'
import { useTheme } from '@mui/material/styles'
import { Link } from '@mui/material'
import * as Lingui from '@lingui/core'

import { ThemeLocales } from '@/types/ThemeLocales'

export default function Splash() {
  const lang = Lingui.i18n.locale || 'fr'
  const [locales, setLocales] = useState<ThemeLocales>()
  const theme = useTheme()

  useEffect(() => {
    async function importLocales() {
      try {
        const response = await fetch(`/theme/locales_${lang}.json`)
        const importedLocales = await response.json()
        setLocales(importedLocales)
      } catch {
        throw new Error('Theme locales could not be imported')
      }
    }

    importLocales()
  }, [lang])

  return (
    <>
      <Box flex={1} display='flex'>
        <Box
          flex={1}
          display='flex'
          flexDirection='column'
          px={2}
          pt={{ xs: 2, md: 6 }}
          pb={2}
        >
          <Box pl={{ lg: 3 }}>
            {/* For all images on this page, <img> is used instead of <Image> so
                that Next.js doesn't include it in the bundle, and instead
                delivers it as is. It can then be replaced with a custom one at
                runtime. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src='/theme/splash_header_logo.svg'
              alt='SoVisuPlus logo'
              style={{ maxHeight: '4.125rem' }}
            />
          </Box>

          <Box
            flex={1}
            display='flex'
            flexDirection='column'
            justifyContent='center'
            alignItems='center'
          >
            <Box mb={7}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src='/theme/splash_preview.png'
                alt='SoVisuPlus preview screenshot'
                style={{
                  boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25)',
                  height: 'auto',
                  maxHeight: '14.75rem',
                  maxWidth: '100%',
                  width: '100%',
                }}
              />
            </Box>

            <Typography
              id='splash-preview-legend'
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
              id='splash-login-button'
              onClick={() => signIn('keycloak')}
              fullWidth
              variant='contained'
              sx={{ maxWidth: '30rem' }}
            >
              {t`splash.login`}
            </Button>
          </Box>

          <Box display='flex' justifyContent='space-between' pl={{ lg: 3 }}>
            <Box
              display='flex'
              flexDirection={{ xs: 'column', lg: 'row' }}
              justifyContent={{ xs: 'flex-end', lg: 'flex-start' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src='/theme/splash_footer_logo.png'
                alt='CRISalid logo'
                style={{ maxHeight: '2.8125rem' }}
              />
            </Box>

            <Box
              id='splash-links'
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
          id='splash-background'
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src='/theme/splash_background.svg'
            alt='SoVisuPlus splash screen background'
            style={{ position: 'absolute', zIndex: -1 }}
          />

          <Box
            id='splash-description'
            maxWidth='60ch'
            display='flex'
            flexDirection='column'
            justifyContent='center'
            bgcolor={`rgb(from ${theme.palette.primary.main} r g b / 75%)`}
            p={2}
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
