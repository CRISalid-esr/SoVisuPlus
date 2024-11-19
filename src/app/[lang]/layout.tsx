import { LanguageProvider } from './LanguageProvider'
import { messages as enMessages } from '@/locales/en/messages'
import { messages as frMessages } from '@/locales/fr/messages'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter'
import React from 'react'

type Props = {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}

export default async function RootLayout({ params, children }: Props) {
  const messages: { [key: string]: Record<string, string> } = {
    en: enMessages,
    fr: frMessages,
  }
  const { lang } = await params

  return (
    <>
      <html lang={lang}>
        <LanguageProvider locale={lang} messages={messages[lang]}>
          <AppRouterCacheProvider>
            <body>{children}</body>
          </AppRouterCacheProvider>
        </LanguageProvider>
      </html>
    </>
  )
}
