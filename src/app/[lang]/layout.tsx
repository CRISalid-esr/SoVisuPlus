import { ThemeProvider } from '@/app/[lang]/context/ThemeContext'
import SessionProviderWrapper from '@/components/SessionProviderWrapper'
import { messages as enMessages } from '@/locales/en/messages'
import { messages as frMessages } from '@/locales/fr/messages'
import { resolveLanguage } from '@/utils/language'
import { CssBaseline } from '@mui/material'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter'
import React from 'react'
import ErrorBoundary from '../[lang]/components/ErrorBoundary'
import DateProvider from './components/DateProvider' // Import the new client component
import ErrorFallback from './components/ErrorFallback'
import { LanguageProvider } from './LanguageProvider'

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
        <title>sovisuplus</title>
      </head>
      <body>
        <DateProvider>
          <ThemeProvider>
            <CssBaseline />
            <LanguageProvider locale={lang} messages={selectedMessages}>
              <AppRouterCacheProvider>
                <ErrorBoundary FallbackComponent={ErrorFallback}>
                  <SessionProviderWrapper>{children}</SessionProviderWrapper>
                </ErrorBoundary>
              </AppRouterCacheProvider>
            </LanguageProvider>
          </ThemeProvider>
        </DateProvider>
      </body>
    </html>
  )
}
