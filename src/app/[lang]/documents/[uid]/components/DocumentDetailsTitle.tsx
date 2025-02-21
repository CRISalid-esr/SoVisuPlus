import useStore from '@/stores/global_store'
import { Typography } from '@mui/material'
import { FC } from 'react'
import * as Lingui from '@lingui/core'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { t } from '@lingui/macro'
import { getLocalizedValue } from '@/utils/getLocalizedValue'

interface DocumentDetailsTitleProps {}
const supportedLocales = process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',')
const DocumentDetailsTitle: FC<DocumentDetailsTitleProps> = ({}) => {
  const { selectedDocument = null } = useStore((state) => state.document)
  const lang = Lingui.i18n.locale as ExtendedLanguageCode
  const localizedTitle = getLocalizedValue(
    selectedDocument?.titles || [],
    lang,
    supportedLocales,
    t`no_title_available`,
  )
  return <Typography variant='h5'>{localizedTitle.value}</Typography>
}

export default DocumentDetailsTitle
