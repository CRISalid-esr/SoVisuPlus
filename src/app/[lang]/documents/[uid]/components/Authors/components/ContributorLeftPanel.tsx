import { useState } from 'react'
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import { Edit } from '@mui/icons-material'
import { t } from '@lingui/core/macro'
import { LocRelator } from '@/types/LocRelator'
import { AureHalAuthorDoc } from '@/lib/services/AureHalAPIClient'
import { WorkingContribution } from '../lib/types'
import { computeContributionStatus } from '../lib/contributionStatus'
import ContributionStatusChip from './ContributionStatusChip'
import IdentifierIconList from './IdentifierIconList'
import HalAuthorAutocomplete from './HalAuthorAutocomplete'
import RoleMultiSelect from './RoleMultiSelect'

interface ContributorLeftPanelProps {
  contribution: WorkingContribution
  disabled?: boolean
  onSelectProfile: (doc: AureHalAuthorDoc) => void
  onAddContributor: (inputText: string) => void
  onSetRoles: (roles: LocRelator[]) => void
}

const ContributorLeftPanel = ({
  contribution,
  disabled,
  onSelectProfile,
  onAddContributor,
  onSetRoles,
}: ContributorLeftPanelProps) => {
  const status = computeContributionStatus(contribution)
  const alwaysShowSearch =
    status === 'identified' || status === 'not_identified'
  const [penOpen, setPenOpen] = useState(false)
  const showSearch = alwaysShowSearch || penOpen
  const isWarningBox = status === 'not_identified'

  return (
    <Stack spacing={1}>
      <Typography variant='subtitle1' fontWeight={600}>
        {contribution.displayName ||
          t`documents_details_page_authors_tab_new_contributor`}
      </Typography>

      <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
        <ContributionStatusChip status={status} />
        <IdentifierIconList identifiers={contribution.identifiers} />
        <Tooltip
          title={t`documents_details_page_authors_tab_edit_identification`}
        >
          <span>
            <IconButton
              size='small'
              disabled={disabled}
              onClick={() => setPenOpen((open) => !open)}
            >
              <Edit fontSize='small' />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {showSearch && (
        <Box
          sx={{
            p: 1,
            borderRadius: 1,
            backgroundColor: isWarningBox ? 'warning.light' : 'grey.100',
          }}
        >
          <HalAuthorAutocomplete
            disabled={disabled}
            onSelectProfile={onSelectProfile}
            onAddContributor={onAddContributor}
          />
        </Box>
      )}

      <RoleMultiSelect
        roles={contribution.roles}
        disabled={disabled}
        onChange={onSetRoles}
      />
    </Stack>
  )
}

export default ContributorLeftPanel
