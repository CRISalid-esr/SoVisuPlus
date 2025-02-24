import { LanguageChips } from '@/components/LanguageChips'
import useStore from '@/stores/global_store'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import * as Lingui from '@lingui/core'
import { Trans } from '@lingui/macro'
import { Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useState } from 'react'

const DocumentDetailsCardTitles = () => {
  const theme = useTheme()
  const lang = Lingui.i18n.locale as ExtendedLanguageCode
  const [selectedLangue, setSelectedLangue] = useState<string | null>(lang)
  const { selectedDocument = null } = useStore((state) => state.document)
  const handleChangeSelectedLanguage = (lang: string) => {
    setSelectedLangue(lang)
  }

  return (
    <>
      <Typography
        sx={{
          color: theme.palette.primary.main,
          fontSize: theme.utils.pxToRem(14),
          fontStyle: 'normal',
          fontWeight: theme.typography[500],
          lineHeight: 'normal',
          letterSpacing: '0.1px',
        }}
      >
        <Trans>document_details_page_titles_row_label</Trans>
      </Typography>
      <LanguageChips
        titles={selectedDocument?.titles ?? []}
        handleChangeSelectedLanguage={handleChangeSelectedLanguage}
        selectedLangue={selectedLangue}
      />
      <Typography>
        {
          selectedDocument?.titles.find(
            (title) => title.language === selectedLangue,
          )?.value
        }
      </Typography>
    </>
  )
}

export default DocumentDetailsCardTitles
