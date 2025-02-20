import { CustomCard } from '@/components/Card'
import useStore from '@/stores/global_store'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import * as Lingui from '@lingui/core'
import { Trans } from '@lingui/react'
import { CardContent, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Box } from '@mui/system'
import { FC } from 'react'

interface DocumentDetailsCardTitlesProps {}
const DocumentDetailsCardTitles: FC<DocumentDetailsCardTitlesProps> = ({}) => {
  const { selectedDocument = null } = useStore((state) => state.document)
  const lang = Lingui.i18n.locale as ExtendedLanguageCode
  const theme = useTheme()

  return <Box component='li'>lorem</Box>
}

export default DocumentDetailsCardTitles
