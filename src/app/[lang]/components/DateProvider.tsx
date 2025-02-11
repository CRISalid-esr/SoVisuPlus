'use client'

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import React from 'react'
import 'dayjs/locale/fr' // Import the French locale
import 'dayjs/locale/en'
import { useLingui } from '@lingui/react'
type Props = {
  children: React.ReactNode
}

export default function DateProvider({ children }: Props) {
  const { i18n } = useLingui() // Get the current language from Lingui
  return (
    <LocalizationProvider
      dateAdapter={AdapterDayjs}
      adapterLocale={i18n.locale} // Use the correct locale dynamically
    >
      {children}
    </LocalizationProvider>
  )
}
