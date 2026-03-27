import { ThemeProvider } from '@/app/[lang]/context/ThemeContext'
import SessionProviderWrapper from '@/components/SessionProviderWrapper'
import { messages as enMessages } from '@/locales/en/messages'
import { messages as frMessages } from '@/locales/fr/messages'
import { resolveLanguage } from '@/utils/language'
import { CssBaseline } from '@mui/material'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter'
import React from 'react'
import ErrorBoundary from '../[lang]/components/ErrorBoundary'
import DateProvider from './components/DateProvider'
import ErrorFallback from './components/ErrorFallback'
import { LanguageProvider } from './LanguageProvider'
import { EnvInjector } from '@/components/EnvInjector'
import Script from 'next/script'

type Props = {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}

const RootLayout = async ({ params, children }: Props) => {
  const messages: { [key: string]: Record<string, string> } = {
    en: enMessages,
    fr: frMessages,
  }
  const { lang, selectedMessages } = await resolveLanguage(params, messages)

  return (
    <html lang={lang}>
      <head>
        <link
          rel='stylesheet'
          href='https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=podium'
        />
        <title>SoVisu+</title>
      </head>
      <body>
        <EnvInjector
          env={{
            NEXT_PUBLIC_SUPPORTED_LOCALES:
              process.env.NEXT_PUBLIC_SUPPORTED_LOCALES,
            NEXT_PUBLIC_ORCID_URL: process.env.NEXT_PUBLIC_ORCID_URL,
            NEXT_PUBLIC_ORCID_SCOPES: process.env.NEXT_PUBLIC_ORCID_SCOPES,
            NEXT_PUBLIC_ORCID_CLIENT_ID:
              process.env.NEXT_PUBLIC_ORCID_CLIENT_ID,
            NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
            NEXT_PUBLIC_WS_SCHEME: process.env.NEXT_PUBLIC_WS_SCHEME,
            NEXT_PUBLIC_WS_HOST: process.env.NEXT_PUBLIC_WS_HOST,
            NEXT_PUBLIC_WS_PORT: process.env.NEXT_PUBLIC_WS_PORT,
            NEXT_PUBLIC_WS_PATH: process.env.NEXT_PUBLIC_WS_PATH ?? '/',
            NEXT_PUBLIC_CAS_URL: process.env.NEXT_PUBLIC_CAS_URL,
            NEXT_PUBLIC_INSTITUTION_NAME:
              process.env.NEXT_PUBLIC_INSTITUTION_NAME,
            NEXT_PUBLIC_AVAILABLE_VOCABS:
              process.env.NEXT_PUBLIC_AVAILABLE_VOCABS,
            NEXT_PUBLIC_HAL_CREATE_ID_URL:
              process.env.NEXT_PUBLIC_HAL_CREATE_ID_URL,
            NEXT_PUBLIC_SUPPORT_SERVICE_EMAIL_ADDR:
              process.env.NEXT_PUBLIC_SUPPORT_SERVICE_EMAIL_ADDR,
            NEXT_PUBLIC_ABOUT_PAGE_URL: process.env.NEXT_PUBLIC_ABOUT_PAGE_URL,
            NEXT_PUBLIC_COMMUNITY_PAGE_URL:
              process.env.NEXT_PUBLIC_COMMUNITY_PAGE_URL,
            NEXT_PUBLIC_TERMS_PAGE_URL: process.env.NEXT_PUBLIC_TERMS_PAGE_URL,
          }}
        />
        <Script src='/vendor/d3.v4.min.js' strategy='beforeInteractive' />
        <Script src='/vendor/wordstream.js' strategy='afterInteractive' />
        <ThemeProvider>
          <CssBaseline />
          <LanguageProvider locale={lang} messages={selectedMessages}>
            <DateProvider>
              <AppRouterCacheProvider>
                <ErrorBoundary FallbackComponent={ErrorFallback}>
                  <SessionProviderWrapper>{children}</SessionProviderWrapper>
                </ErrorBoundary>
              </AppRouterCacheProvider>
            </DateProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
export default RootLayout
