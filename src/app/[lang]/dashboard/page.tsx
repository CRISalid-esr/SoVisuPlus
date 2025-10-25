'use client'

import { t } from '@lingui/core/macro'
import { Box } from '@mui/material'
import useStore from '@/stores/global_store'
import * as Lingui from '@lingui/core'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import DocumentHeader from '@/app/[lang]/documents/components/DocumentHeader'
import WorkInProgress from '@/components/WorkInProgress/WorkInProgress'

export default function DashboardPage() {
  const { currentPerspective } = useStore((state) => state.user)
  const lang = Lingui.i18n.locale as ExtendedLanguageCode
  return (
    <Box>
      <DocumentHeader
        perspective={currentPerspective?.getDisplayName(lang) || ''}
        pageName={t`dashboard_page_main_title`}
      />
      <WorkInProgress
        title={t`dashboard_page_wip_title`}
        description={t`dashboard_page_wip_description`}
        variant='page'
      />
    </Box>
  )
}
