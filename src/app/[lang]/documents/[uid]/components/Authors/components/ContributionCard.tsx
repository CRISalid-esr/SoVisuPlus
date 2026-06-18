import { memo } from 'react'
import { Box, Divider, IconButton, Stack, Tooltip } from '@mui/material'
import { ArrowDownward, ArrowUpward, DragIndicator } from '@mui/icons-material'
import { t } from '@lingui/core/macro'
import { LocRelator } from '@/types/LocRelator'
import { AureHalAuthorDoc } from '@/lib/services/AureHalAPIClient'
import { halStructureToAffiliation } from '../lib/halMapping'
import { HalAffiliationType } from '../lib/affiliationType'
import { WorkingAffiliation, WorkingContribution } from '../lib/types'
import ContributorLeftPanel from './ContributorLeftPanel'
import AffiliationPanel from './AffiliationPanel'

interface ContributionCardProps {
  contribution: WorkingContribution
  index: number
  total: number
  rankingMode: boolean
  disabled?: boolean
  readOnly?: boolean
  // Stable editor actions (each a useCallback from useContributionsEditor). The
  // card binds its own `localId` instead of the parent pre-binding an inline arrow
  // per card, so these references stay constant across list re-renders — which lets
  // React.memo skip cards whose `contribution` did not change.
  removeContribution: (localId: string) => void
  moveContribution: (localId: string, direction: -1 | 1) => void
  reorderContribution: (fromIndex: number, toIndex: number) => void
  applyHalAuthor: (localId: string, doc: AureHalAuthorDoc) => void
  markNotAligned: (localId: string, inputText: string) => void
  setRoles: (localId: string, roles: LocRelator[]) => void
  removeAffiliation: (localId: string, affiliationLocalId: string) => void
  replaceAffiliation: (
    localId: string,
    affiliationLocalId: string,
    affiliation: WorkingAffiliation,
  ) => void
  setAffiliationType: (
    localId: string,
    affiliationLocalId: string,
    type: HalAffiliationType | null,
  ) => void
  addAffiliation: (localId: string, affiliation: WorkingAffiliation) => void
}

const ContributionCard = memo(function ContributionCard({
  contribution,
  index,
  total,
  rankingMode,
  disabled,
  readOnly,
  removeContribution,
  moveContribution,
  reorderContribution,
  applyHalAuthor,
  markNotAligned,
  setRoles,
  removeAffiliation,
  replaceAffiliation,
  setAffiliationType,
  addAffiliation,
}: ContributionCardProps) {
  const { localId } = contribution
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
        if (!Number.isNaN(from) && from !== index) {
          reorderContribution(from, index)
        }
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
                onClick={() => moveContribution(localId, -1)}
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
                onClick={() => moveContribution(localId, 1)}
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
            onSelectProfile={(doc) => applyHalAuthor(localId, doc)}
            onAddContributor={(inputText) => markNotAligned(localId, inputText)}
            onSetRoles={(roles) => setRoles(localId, roles)}
            onRemove={() => removeContribution(localId)}
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
            onRemoveAffiliation={(affLocalId) =>
              removeAffiliation(localId, affLocalId)
            }
            onReplaceAffiliation={(affLocalId, doc) =>
              replaceAffiliation(
                localId,
                affLocalId,
                halStructureToAffiliation(doc),
              )
            }
            onChangeAffiliationType={(affLocalId, type) =>
              setAffiliationType(localId, affLocalId, type)
            }
            onAddAffiliation={(doc) =>
              addAffiliation(localId, halStructureToAffiliation(doc))
            }
          />
        </Box>
      </Box>
    </Box>
  )
})

export default ContributionCard
