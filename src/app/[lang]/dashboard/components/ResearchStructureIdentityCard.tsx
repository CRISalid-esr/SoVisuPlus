'use client'

import React from 'react'
import { Card, CardContent, Stack, Typography } from '@mui/material'
import * as Lingui from '@lingui/core'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { IAgent } from '@/types/IAgent'
import { isResearchStructure } from '@/types/ResearchStructure'

const ResearchStructureIdentityCard = ({
  researchStructure,
}: {
  researchStructure: IAgent
}) => {
  if (!isResearchStructure(researchStructure)) {
    throw new Error(
      'ResearchStructureIdentityCard: agent is not a ResearchStructure',
    )
  }
  const lang = (Lingui.i18n.locale || 'ul') as ExtendedLanguageCode
  const displayName = researchStructure.getDisplayName(lang) || ''
  return (
    <Card sx={{ borderRadius: 1, boxShadow: 1, width: '100%' }}>
      <CardContent sx={{ py: 3 }}>
        <Stack alignItems='center' spacing={2}>
          <Typography align='center' sx={{ fontWeight: 700 }}>
            {displayName || 'N/C'}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}
export default ResearchStructureIdentityCard
