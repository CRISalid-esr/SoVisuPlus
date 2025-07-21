import { LanguageChips } from '@/components/LanguageChips'
import useStore from '@/stores/global_store'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import * as Lingui from '@lingui/core'
import { t, Trans } from '@lingui/macro'
import { Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import RowLabel from './RowLabel'

export default function Abstracts() {
  const lang = Lingui.i18n.locale as ExtendedLanguageCode
  const [selectedLang, setSelectedLang] = useState<string>(lang)
  const { selectedDocument } = useStore((state) => state.document)

  const abstract =
    selectedDocument?.abstracts?.find(
      (abstract) => abstract.language === selectedLang,
    )?.value || t`document_details_page_no_abstract_available`

  useEffect(() => {
    if (
      selectedDocument?.abstracts?.some(
        (abstract) => abstract.language === selectedLang,
      )
    ) {
      return
    }
    const supportedLocales =
      process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',') || []
    const abstractsInSupportedLocales = selectedDocument?.abstracts?.filter(
      (abstract) => supportedLocales.includes(abstract.language),
    )
    if (abstractsInSupportedLocales && abstractsInSupportedLocales.length > 0) {
      setSelectedLang(abstractsInSupportedLocales[0].language)
      return
    }
    if (selectedDocument?.abstracts && selectedDocument.abstracts.length > 0) {
      setSelectedLang(selectedDocument.abstracts[0].language)
    }
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
