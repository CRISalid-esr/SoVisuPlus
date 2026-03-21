'use client'

import React from 'react'
import { Card, CardContent, Typography } from '@mui/material'
import type { IAgent } from '@/types/IAgent'
import { isPerson, Person } from '@/types/Person'

import PersonIdentityCard from '@/app/[lang]/dashboard/components/PersonIdentityCard'
import ResearchUnitIdentityCard from '@/app/[lang]/dashboard/components/ResearchUnitIdentityCard'
import { isResearchUnit, ResearchUnit } from '@/types/ResearchUnit'
import { Trans } from '@lingui/react/macro'

const AgentIdentityCard = ({ agent }: { agent: IAgent | null | undefined }) => {
  if (isPerson(agent)) {
    return <PersonIdentityCard person={agent as Person} />
  }

  if (isResearchUnit(agent)) {
    return <ResearchUnitIdentityCard researchUnit={agent as ResearchUnit} />
  }

  return (
    <Card sx={{ borderRadius: 1, boxShadow: 1, width: '100%' }}>
      <CardContent>
        <Typography color='text.secondary'>
          <Trans>dashboard_page_agent_identity_card_no_agent_selected</Trans>
        </Typography>
      </CardContent>
    </Card>
  )
}
export default AgentIdentityCard
