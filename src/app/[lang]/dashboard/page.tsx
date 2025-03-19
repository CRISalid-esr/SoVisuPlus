'use client'

import { t } from '@lingui/macro'
import { Box } from '@mui/material'
import useStore from '@/stores/global_store'
import * as Lingui from '@lingui/core'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import DocumentHeader from '@/app/[lang]/documents/components/DocumentHeader'

export default function DashboardPage() {
  const { currentPerspective } = useStore((state) => state.user)
  const lang = Lingui.i18n.locale as ExtendedLanguageCode
  return (
    <Box>
      <DocumentHeader
        perspective={
          currentPerspective?.getDisplayName(lang as ExtendedLanguageCode) || ''
        }
        pageName={t`dashboard_page_main_title`}
      />
    </Box>
  )
}
