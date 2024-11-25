import { LanguageProvider } from './LanguageProvider'
import { messages as enMessages } from '@/locales/en/messages'
import { messages as frMessages } from '@/locales/fr/messages'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter'
import React from 'react'
import { resolveLanguage } from '@/utils/language'
import { CssBaseline} from '@mui/material'
import { ThemeProvider } from '@/app/[lang]/context/ThemeContext'
import { Inter, Roboto } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const roboto = Roboto({
  weight: ['400', '500', '700'], // Add the weights you want
  subsets: ['latin'],
  variable: '--font-roboto',
})

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
        <ThemeProvider>
          <CssBaseline />
          <LanguageProvider locale={lang} messages={selectedMessages}>
            <AppRouterCacheProvider>
              <body>
                {children}
              </body>
            </AppRouterCacheProvider>
          </LanguageProvider>
        </ThemeProvider>
      </html>
    </>
  )
}
