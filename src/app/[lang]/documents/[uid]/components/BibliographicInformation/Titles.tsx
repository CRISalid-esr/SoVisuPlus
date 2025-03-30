import { LanguageChips } from '@/components/LanguageChips'
import useStore from '@/stores/global_store'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import * as Lingui from '@lingui/core'
import { t, Trans } from '@lingui/macro'
import { Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useEffect, useState } from 'react'

const Titles = () => {
  const theme = useTheme()
  const lang = Lingui.i18n.locale as ExtendedLanguageCode
  const [selectedLang, setSelectedLang] = useState<string>(lang)
  const { selectedDocument } = useStore((state) => state.document)

  const title: string =
    selectedDocument?.titles?.find((title) => title.language === selectedLang)
      ?.value || t`document_details_page_no_title_available`

  useEffect(() => {
    if (
      selectedDocument?.titles?.some((title) => title.language === selectedLang)
    ) {
      return
    }
    const supportedLocales =
      process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',') || []
    const titlesInSupportedLocales = selectedDocument?.titles?.filter((title) =>
      supportedLocales.includes(title.language),
    )
    if (titlesInSupportedLocales && titlesInSupportedLocales.length > 0) {
      setSelectedLang(titlesInSupportedLocales[0].language)
      return
    }
    if (selectedDocument?.titles && selectedDocument.titles.length > 0) {
      setSelectedLang(selectedDocument.titles[0].language)
    }
  }, [selectedLang, selectedDocument])

  const handleLanguageChange = (lang: string) => {
    setSelectedLang(lang)
  }

  return (
    <>
      <Typography
        sx={{
          color: theme.palette.primary.main,
          fontSize: theme.utils.pxToRem(14),
          fontWeight: theme.typography.fontWeightMedium,
          letterSpacing: '0.1px',
        }}
      >
        <Trans>document_details_page_titles_row_label</Trans>
      </Typography>

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
