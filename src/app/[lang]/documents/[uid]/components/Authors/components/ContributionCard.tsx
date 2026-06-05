import { Box, Divider, IconButton, Stack, Tooltip } from '@mui/material'
import { ArrowDownward, ArrowUpward, DragIndicator } from '@mui/icons-material'
import { t } from '@lingui/core/macro'
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
  readOnly?: boolean
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
  onReorder: (fromIndex: number, toIndex: number) => void
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
  readOnly,
  onRemove,
  onMove,
  onReorder,
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

  const dndEnabled = rankingMode && !readOnly && !disabled
  const showHeader = rankingMode && !readOnly

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'grey.300',
        borderRadius: 3,
        overflow: 'hidden',
      }}
      onDragOver={(event) => {
        if (dndEnabled) event.preventDefault()
      }}
      onDrop={(event) => {
        if (!dndEnabled) return
        event.preventDefault()
        const from = Number(event.dataTransfer.getData('text/plain'))
        if (!Number.isNaN(from) && from !== index) onReorder(from, index)
      }}
    >
      {showHeader && (
        <Stack
          direction='row'
          alignItems='center'
          spacing={0.5}
          sx={{
            px: 1,
            py: 0.5,
            borderBottom: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          <Tooltip
            title={t`documents_details_page_authors_tab_drag_to_reorder`}
          >
            <Box
              component='span'
              draggable={dndEnabled}
              onDragStart={(event) => {
                if (!dndEnabled) return
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', String(index))
              }}
              sx={{ display: 'flex', cursor: dndEnabled ? 'grab' : 'default' }}
            >
              <DragIndicator fontSize='small' sx={{ color: 'text.disabled' }} />
            </Box>
          </Tooltip>
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
        </Stack>
      )}

      <Box
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ContributorLeftPanel
            contribution={contribution}
            disabled={disabled}
            readOnly={readOnly}
            onSelectProfile={onSelectProfile}
            onAddContributor={onAddContributor}
            onSetRoles={onSetRoles}
            onRemove={onRemove}
          />
        </Box>
        <Divider
          orientation='vertical'
          flexItem
          sx={{ display: { xs: 'none', md: 'block' }, borderColor: 'grey.300' }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <AffiliationPanel
            affiliations={contribution.affiliations}
            disabled={disabled}
            readOnly={readOnly}
            canAddAffiliation={canAddAffiliation}
            onRemoveAffiliation={onRemoveAffiliation}
            onReplaceAffiliation={onReplaceAffiliation}
            onAddAffiliation={onAddAffiliation}
          />
        </Box>
      </Box>
    </Box>
  )
}

export default ContributionCard
