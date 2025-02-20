import useStore from '@/stores/global_store'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { getLocalizedValue } from '@/utils/getLocalizedValue'
import * as Lingui from '@lingui/core'
import { Trans } from '@lingui/macro'
import { Chip, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Box } from '@mui/system'
import { FC, useState } from 'react'
import { t } from '@lingui/macro'

interface DocumentDetailsCardTitlesProps {}
const DocumentDetailsCardTitles: FC<DocumentDetailsCardTitlesProps> = ({}) => {
  const { selectedDocument = null } = useStore((state) => state.document)
  const [selectedTitleLangs, setSelectedTitleLangs] = useState<
    Record<string, string>
  >({})
  const lang = Lingui.i18n.locale as ExtendedLanguageCode
  const theme = useTheme()
  const supportedLocales = process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',')

  const renderTitles = () => {
    const chips = selectedDocument?.titles.map((title, index) => {
      const localizedTitle = getLocalizedValue(
        selectedDocument?.titles || [],
        lang,
        supportedLocales,
        t`no_title_available`,
      )
      const effectiveRowLang = localizedTitle.language

      console.log('title.language   ', title.language)

      // skip ul : undetermined language
      if (title.language === 'ul') {
        return null
      }
      return (
        <Chip
          key={index}
          size='small'
          sx={{
            marginRight: theme.spacing(1),
          }}
          clickable={title.language !== effectiveRowLang}
          label={title.language}
          onClick={(e) => {
            if (title.language === effectiveRowLang) {
              e.preventDefault()
              return
            }
            console.log('selectedDocument.uid', selectedDocument.uid)
            setSelectedTitleLangs({
              ...selectedTitleLangs,
              [selectedDocument.uid]: title.language,
            })
          }}
          color={title.language === effectiveRowLang ? 'primary' : 'default'}
        />
      )
    })

    return chips
  }

  return (
    <Box component='li'>
      <Typography>
        <Trans>document_details_page_titles_row</Trans>
      </Typography>
      {renderTitles()}
    </Box>
  )
}

export default DocumentDetailsCardTitles
