'use client'
import { I18nProvider } from '@lingui/react'
import { i18n } from '@lingui/core'
import { useEffect, useState } from 'react'

type Props = {
  children: React.ReactNode
  messages: Record<string, string>
  locale: string
}

export function LanguageProvider({ children, messages, locale }: Props) {
  const [ready, setReady] = useState(i18n.locale === locale)

  useEffect(() => {
    i18n.load(locale, messages)
    i18n.activate(locale)
    setReady(true)
  }, [locale, messages])

  if (!ready) return null

  return <I18nProvider i18n={i18n}>{children}</I18nProvider>
}
