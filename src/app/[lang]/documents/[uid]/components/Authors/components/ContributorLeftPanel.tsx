import { useState } from 'react'
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import { DeleteOutline, Edit, EditOff } from '@mui/icons-material'
import { t } from '@lingui/core/macro'
import { LocRelator, LocRelatorHelper } from '@/types/LocRelator'
import { AureHalAuthorDoc } from '@/lib/services/AureHalAPIClient'
import { WorkingContribution } from '../lib/types'
import { computeContributionStatus } from '../lib/contributionStatus'
import ContributionStatusChip from './ContributionStatusChip'
import IdentifierIconList from './IdentifierIconList'
import HalAuthorAutocomplete from './HalAuthorAutocomplete'
import HalProfileSuggestions from './HalProfileSuggestions'
import RoleMultiSelect from './RoleMultiSelect'

interface ContributorLeftPanelProps {
  contribution: WorkingContribution
  disabled?: boolean
  readOnly?: boolean
  onSelectProfile: (doc: AureHalAuthorDoc) => void
  onAddContributor: (inputText: string) => void
  onSetRoles: (roles: LocRelator[]) => void
  onRemove: () => void
}

const ContributorLeftPanel = ({
  contribution,
  disabled,
  readOnly,
  onSelectProfile,
  onAddContributor,
  onSetRoles,
  onRemove,
}: ContributorLeftPanelProps) => {
  const status = computeContributionStatus(contribution)
  const isNotIdentified = status === 'not_identified'
  const isNotAligned = status === 'not_aligned'
  // A row with no person uid is fresh-added (always starts 'Not identified') or was
  // detached. A fresh 'Not identified' row shows the autocomplete so the user can pick
  // a HAL profile; once one is selected it becomes identified/aligned and behaves
  // exactly like a baseline contributor (no autocomplete, no pen). Only 'Not aligned'
  // rows keep the pen to show/hide the autocomplete.
  const isNew = contribution.personUid === null

  const [showSearch, setShowSearch] = useState(false)
  const showPen = !readOnly && isNotAligned
  // Autocomplete: shown open for a fresh 'Not identified' row; pen-toggled for
  // 'Not aligned'. Nothing else shows it.
  const searchVisible =
    !readOnly && ((isNew && isNotIdentified) || (isNotAligned && showSearch))
  // Baseline 'Not identified' rows get the suggestion panel instead.
  const showSuggestions = !readOnly && !isNew && isNotIdentified
  const isWarningBox = isNotIdentified

  const handleSelectProfile = (doc: AureHalAuthorDoc) => {
    onSelectProfile(doc)
    setShowSearch(false) // hide the search after a selection
  }
  const handleAddContributor = (inputText: string) => {
    onAddContributor(inputText)
    setShowSearch(false)
  }

  return (
    <Box sx={{ position: 'relative', pr: readOnly ? 0 : 4 }}>
      {!readOnly && (
        <Tooltip
          title={t`documents_details_page_authors_tab_remove_contributor`}
        >
          <span style={{ position: 'absolute', top: 0, right: 0 }}>
            <IconButton size='small' disabled={disabled} onClick={onRemove}>
              <DeleteOutline fontSize='small' />
            </IconButton>
          </span>
        </Tooltip>
      )}

      <Stack spacing={2}>
        <Typography variant='subtitle1' fontWeight={600}>
          {contribution.displayName ||
            t`documents_details_page_authors_tab_new_contributor`}
        </Typography>

        <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
          <ContributionStatusChip status={status} />
          <IdentifierIconList identifiers={contribution.identifiers} />
          {showPen && (
            <Tooltip
              title={
                showSearch
                  ? t`documents_details_page_authors_tab_hide_hal_search`
                  : t`documents_details_page_authors_tab_edit_identification`
              }
            >
              <span>
                <IconButton
                  size='small'
                  disabled={disabled}
                  onClick={() => setShowSearch((open) => !open)}
                >
                  {showSearch ? (
                    <EditOff fontSize='small' />
                  ) : (
                    <Edit fontSize='small' />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Stack>

        {searchVisible && (
          <Box
            sx={{
              p: 1,
              borderRadius: 1,
              ...(isWarningBox
                ? {
                    backgroundColor: (theme) => theme.palette.warningSurface,
                    border: '1px solid',
                    borderColor: (theme) => theme.palette.warningOutline,
                  }
                : {
                    backgroundColor: 'grey.100',
                    border: '1px solid',
                    borderColor: 'grey.300',
                  }),
            }}
          >
            <HalAuthorAutocomplete
              disabled={disabled}
              onSelectProfile={handleSelectProfile}
              onAddContributor={handleAddContributor}
            />
          </Box>
        )}

        {showSuggestions && (
          <HalProfileSuggestions
            displayName={contribution.displayName}
            disabled={disabled}
            onConfirm={onSelectProfile}
          />
        )}

        {readOnly ? (
          <Typography variant='body2'>
            <Box component='span' sx={{ fontWeight: 600 }}>
              {t`documents_details_page_authors_tab_roles_label`} :
            </Box>{' '}
            {contribution.roles
              .map((role) => LocRelatorHelper.toLabel(role))
              .join(', ')}
          </Typography>
        ) : (
          <RoleMultiSelect
            roles={contribution.roles}
            disabled={disabled}
            onChange={onSetRoles}
          />
        )}
      </Stack>
    </Box>
  )
}

export default ContributorLeftPanel
