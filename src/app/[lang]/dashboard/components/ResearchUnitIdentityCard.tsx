'use client'

import React from 'react'
import { Card, CardContent, Stack, Typography } from '@mui/material'
import * as Lingui from '@lingui/core'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { IAgent } from '@/types/IAgent'
import { isResearchUnit } from '@/types/ResearchUnit'

const ResearchUnitIdentityCard = ({
  researchUnit,
}: {
  researchUnit: IAgent
}) => {
  if (!isResearchUnit(researchUnit)) {
    throw new Error('ResearchUnitIdentityCard: agent is not a ResearchUnit')
  }
  const lang = (Lingui.i18n.locale || 'ul') as ExtendedLanguageCode
  const displayName = researchUnit.getDisplayName(lang) || ''
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
export default ResearchUnitIdentityCard
