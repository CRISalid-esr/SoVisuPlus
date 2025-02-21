import { LanguageChips } from '@/components/LanguageChips'
import useStore from '@/stores/global_store'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import * as Lingui from '@lingui/core'
import { Trans } from '@lingui/macro'
import { Typography } from '@mui/material'
import { Box } from '@mui/system'
import { FC, useState } from 'react'

interface DocumentDetailsCardTitlesProps {}
const DocumentDetailsCardTitles: FC<DocumentDetailsCardTitlesProps> = ({}) => {
  const lang = Lingui.i18n.locale as ExtendedLanguageCode
  const [selectedLangue, setSelectedLangue] = useState<string | null>(lang)
  const { selectedDocument = null } = useStore((state) => state.document)
  const handleChangeSelectedLanguage = (lang: string) => {
    setSelectedLangue(lang)
  }

  return (
    <Box component='li'>
      <Typography>
        <Trans>document_details_page_titles_row</Trans>
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
    </Box>
  )
}

export default DocumentDetailsCardTitles
