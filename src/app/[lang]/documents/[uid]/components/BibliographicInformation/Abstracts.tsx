import * as Lingui from '@lingui/core'
import { t, Trans } from '@lingui/macro'
import { Typography } from '@mui/material'
import { useEffect, useState } from 'react'

import { LanguageChips } from '@/components/LanguageChips'
import useStore from '@/stores/global_store'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { getLocalizedValue } from '@/utils/getLocalizedValue'
import RowLabel from './RowLabel'

export default function Abstracts() {
  const lang = Lingui.i18n.locale as ExtendedLanguageCode
  const [selectedLang, setSelectedLang] = useState<string>(lang)
  const [abstract, setAbstract] = useState('')
  const { selectedDocument } = useStore((state) => state.document)

  useEffect(() => {
    const supportedLocales =
      process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',') || []

    const { language, value } = getLocalizedValue(
      selectedDocument?.abstracts ?? [],
      selectedLang,
      supportedLocales,
      t`document_details_page_no_abstract_available`,
    )

    if (language !== selectedLang) {
      setSelectedLang(language)
    }

    setAbstract(value)
  }, [selectedLang, selectedDocument])

  const handleLanguageChange = (lang: string) => {
    setSelectedLang(lang)
  }

  return (
    <>
      <RowLabel>
        <Trans>document_details_page_abstracts_row_label</Trans>
      </RowLabel>

      <LanguageChips
        texts={selectedDocument?.abstracts ?? []}
        selectedLang={selectedLang}
        onLanguageSelect={handleLanguageChange}
      />

      <Typography>{abstract}</Typography>
    </>
  )
}
