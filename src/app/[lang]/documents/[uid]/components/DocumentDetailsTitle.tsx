import { t } from '@lingui/core/macro'
import useStore from '@/stores/global_store'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { getLocalizedValue } from '@/utils/getLocalizedValue'
import * as Lingui from '@lingui/core'
import { Typography } from '@mui/material'

const supportedLocales = process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',')
const DocumentDetailsTitle = () => {
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
