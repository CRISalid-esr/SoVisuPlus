import { LanguageProvider } from './LanguageProvider'
import { messages as enMessages } from '@/locales/en/messages'
import { messages as frMessages } from '@/locales/fr/messages'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter'
import React from 'react'
import { resolveLanguage } from '@/utils/language'
import { CssBaseline, ThemeProvider } from '@mui/material'
import theme from '../theme'

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
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <LanguageProvider locale={lang} messages={selectedMessages}>
            <AppRouterCacheProvider>
              <body>{children}</body>
            </AppRouterCacheProvider>
          </LanguageProvider>
        </ThemeProvider>
      </html>
    </>
  )
}
