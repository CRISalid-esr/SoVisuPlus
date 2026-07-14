'use client'

import React from 'react'
import { Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import * as Lingui from '@lingui/core'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { IAgent } from '@/types/IAgent'
import { isOrganizationUnit, OrganizationUnit } from '@/types/OrganizationUnit'

const OrganizationUnitIdentityCard = ({
  organizationUnit,
}: {
  organizationUnit: IAgent
}) => {
  if (!isOrganizationUnit(organizationUnit)) {
    throw new Error(
      'OrganizationUnitIdentityCard: agent is not an OrganizationUnit',
    )
  }
  const organization = organizationUnit as OrganizationUnit
  const lang = (Lingui.i18n.locale || 'ul') as ExtendedLanguageCode
  const displayName = organization.getDisplayName(lang) || ''
  // Local type first, national type as fallback — never the generic type.
  const displayType = organization.getDisplayType(lang)
  const localTypeUsed =
    displayType !== null && displayType !== organization.nationalType
  const secondaryType = localTypeUsed ? organization.nationalType : null
  return (
    <Card sx={{ borderRadius: 1, boxShadow: 1, width: '100%' }}>
      <CardContent sx={{ py: 3 }}>
        <Stack alignItems='center' spacing={2}>
          <Typography align='center' sx={{ fontWeight: 700 }}>
            {displayName || 'N/C'}
          </Typography>
          {organization.acronym && organization.acronym !== displayName && (
            <Typography align='center' color='text.secondary'>
              {organization.acronym}
            </Typography>
          )}
          {displayType && (
            <Stack direction='row' spacing={1}>
              <Chip size='small' label={displayType} />
              {secondaryType && (
                <Chip size='small' variant='outlined' label={secondaryType} />
              )}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
export default OrganizationUnitIdentityCard
