import { Box, IconButton, Stack, Tooltip } from '@mui/material'
import {
  ArrowDownward,
  ArrowUpward,
  DeleteOutline,
  DragIndicator,
} from '@mui/icons-material'
import { t } from '@lingui/core/macro'
import CustomCard from '@/app/[lang]/components/Card/CustomCard'
import { LocRelator } from '@/types/LocRelator'
import {
  AureHalAuthorDoc,
  AureHalStructureDoc,
} from '@/lib/services/AureHalAPIClient'
import { WorkingContribution } from '../lib/types'
import ContributorLeftPanel from './ContributorLeftPanel'
import AffiliationPanel from './AffiliationPanel'

interface ContributionCardProps {
  contribution: WorkingContribution
  index: number
  total: number
  rankingMode: boolean
  disabled?: boolean
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
  onSelectProfile: (doc: AureHalAuthorDoc) => void
  onAddContributor: (inputText: string) => void
  onSetRoles: (roles: LocRelator[]) => void
  onRemoveAffiliation: (affiliationLocalId: string) => void
  onReplaceAffiliation: (
    affiliationLocalId: string,
    doc: AureHalStructureDoc,
  ) => void
  onAddAffiliation: (doc: AureHalStructureDoc) => void
}

const ContributionCard = ({
  contribution,
  index,
  total,
  rankingMode,
  disabled,
  onRemove,
  onMove,
  onSelectProfile,
  onAddContributor,
  onSetRoles,
  onRemoveAffiliation,
  onReplaceAffiliation,
  onAddAffiliation,
}: ContributionCardProps) => {
  const canAddAffiliation = !(
    contribution.personUid === null &&
    !contribution.notAligned &&
    contribution.identifiers.length === 0 &&
    !contribution.displayName
  )

  const header = (
    <Stack direction='row' alignItems='center' justifyContent='space-between'>
      <Stack direction='row' alignItems='center' spacing={0.5}>
        {rankingMode && (
          <>
            <DragIndicator fontSize='small' sx={{ color: 'text.disabled' }} />
            <Tooltip title={t`documents_details_page_authors_tab_move_up`}>
              <span>
                <IconButton
                  size='small'
                  disabled={disabled || index === 0}
                  onClick={() => onMove(-1)}
                >
                  <ArrowUpward fontSize='small' />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={t`documents_details_page_authors_tab_move_down`}>
              <span>
                <IconButton
                  size='small'
                  disabled={disabled || index === total - 1}
                  onClick={() => onMove(1)}
                >
                  <ArrowDownward fontSize='small' />
                </IconButton>
              </span>
            </Tooltip>
          </>
        )}
      </Stack>
      <Tooltip title={t`documents_details_page_authors_tab_remove_contributor`}>
        <span>
          <IconButton size='small' disabled={disabled} onClick={onRemove}>
            <DeleteOutline fontSize='small' />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  )

  return (
    <CustomCard header={header}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ContributorLeftPanel
            contribution={contribution}
            disabled={disabled}
            onSelectProfile={onSelectProfile}
            onAddContributor={onAddContributor}
            onSetRoles={onSetRoles}
          />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <AffiliationPanel
            affiliations={contribution.affiliations}
            disabled={disabled}
            canAddAffiliation={canAddAffiliation}
            onRemoveAffiliation={onRemoveAffiliation}
            onReplaceAffiliation={onReplaceAffiliation}
            onAddAffiliation={onAddAffiliation}
          />
        </Box>
      </Box>
    </CustomCard>
  )
}

export default ContributionCard
