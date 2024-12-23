import { LanguageProvider } from './LanguageProvider'
import { messages as enMessages } from '@/locales/en/messages'
import { messages as frMessages } from '@/locales/fr/messages'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter'
import React from 'react'
import { resolveLanguage } from '@/utils/language'
import { CssBaseline } from '@mui/material'
import { ThemeProvider } from '@/app/[lang]/context/ThemeContext'
import SessionProviderWrapper from '@/components/SessionProviderWrapper'
import ErrorBoundary from '../[lang]/components/ErrorBoundary'
import ErrorFallback from './components/ErrorFallback'

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
    <>
      <html lang={lang}>
        <title>sovisuplus</title>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <ThemeProvider>
            <CssBaseline />
            <LanguageProvider locale={lang} messages={selectedMessages}>
              <AppRouterCacheProvider>
                <SessionProviderWrapper>
                  <body>{children}</body>
                </SessionProviderWrapper>
              </AppRouterCacheProvider>
            </LanguageProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </html>
    </>
  )
}
