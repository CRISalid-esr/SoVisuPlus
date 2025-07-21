import * as Lingui from '@lingui/core'
import { t, Trans } from '@lingui/macro'
import { Typography } from '@mui/material'
import { useEffect, useState } from 'react'

import { getLocalizedValue } from '@/utils/getLocalizedValue'
import { LanguageChips } from '@/components/LanguageChips'
import useStore from '@/stores/global_store'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import RowLabel from './RowLabel'

const Titles = () => {
  const lang = Lingui.i18n.locale as ExtendedLanguageCode
  const [selectedLang, setSelectedLang] = useState<string>(lang)
  const [title, setTitle] = useState('')
  const { selectedDocument } = useStore((state) => state.document)

  useEffect(() => {
    const supportedLocales =
      process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',') || []

    const { language, value } = getLocalizedValue(
      selectedDocument?.titles ?? [],
      selectedLang,
      supportedLocales,
      t`document_details_page_no_title_available`,
    )

    if (language !== selectedLang) {
      setSelectedLang(language)
    }

    setTitle(value)
  }, [selectedLang, selectedDocument])

  const handleLanguageChange = (lang: string) => {
    setSelectedLang(lang)
  }

  return (
    <>
      <RowLabel isPrimary>
        <Trans>document_details_page_titles_row_label</Trans>
      </RowLabel>

      <LanguageChips
        texts={selectedDocument?.titles ?? []}
        selectedLang={selectedLang}
        onLanguageSelect={handleLanguageChange}
      />

      <Typography>{title}</Typography>
    </>
  )
}

export default Titles
