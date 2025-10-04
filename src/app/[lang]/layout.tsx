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

type Props = {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}

export default async function RootLayout({ params, children }: Props) {
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
        <title>sovisuplus</title>
      </head>
      <body>
        <EnvInjector
          env={{
            ORCID_URL: process.env.ORCID_URL,
            APP_URL: process.env.APP_URL,
            ORCID_SCOPES: process.env.ORCID_SCOPES,
            ORCID_CLIENT_ID: process.env.ORCID_CLIENT_ID,
            WS_SCHEME: process.env.WS_SCHEME,
            WS_HOST: process.env.WS_HOST,
            WS_PORT: process.env.WS_PORT,
            WS_PATH: process.env.WS_PATH ?? '/',
          }}
        />
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
