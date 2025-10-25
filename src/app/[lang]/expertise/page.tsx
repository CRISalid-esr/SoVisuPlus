'use client'

import { t } from '@lingui/macro'
import { Box } from '@mui/material'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import DocumentHeader from '@/app/[lang]/documents/components/DocumentHeader'
import useStore from '@/stores/global_store'
import * as Lingui from '@lingui/core'
import WorkInProgress from '@/components/WorkInProgress/WorkInProgress'

export default function ExpertisePage() {
  const { currentPerspective } = useStore((state) => state.user)
  const lang = Lingui.i18n.locale as ExtendedLanguageCode
  return (
    <Box>
      <DocumentHeader
        perspective={
          currentPerspective?.getDisplayName(lang as ExtendedLanguageCode) || ''
        }
        pageName={t`expertise_page_main_title`}
      />
      <WorkInProgress
        title={t`expertise_page_wip_title`}
        description={t`expertise_page_wip_description`}
        variant='page'
      />
    </Box>
  )
}
