import {
  Box,
  Chip,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { CheckCircle, DeleteOutline, Warning } from '@mui/icons-material'
import { t } from '@lingui/core/macro'
import { AureHalStructureDoc } from '@/lib/services/AureHalAPIClient'
import { WorkingAffiliation } from '../lib/types'
import { isAffiliationIdentified } from '../lib/halMapping'
import { orderedAffiliationIdentifiers } from '../lib/affiliationDisplay'
import {
  HAL_AFFILIATION_TYPES,
  HalAffiliationType,
} from '../lib/affiliationType'
import { halAffiliationTypeLabel } from '../lib/affiliationTypeLabels'
import AffiliationSuggestions from './AffiliationSuggestions'
import HalStructureAutocomplete from './HalStructureAutocomplete'

interface AffiliationCardProps {
  affiliation: WorkingAffiliation
  disabled?: boolean
  readOnly?: boolean
  onRemove: (affiliationLocalId: string) => void
  onSelectStructure: (
    affiliationLocalId: string,
    doc: AureHalStructureDoc,
  ) => void
  onChangeType: (
    affiliationLocalId: string,
    type: HalAffiliationType | null,
  ) => void
}

const AffiliationCard = ({
  affiliation,
  disabled,
  readOnly,
  onRemove,
  onSelectStructure,
  onChangeType,
}: AffiliationCardProps) => {
  const identified = isAffiliationIdentified(affiliation)
  const name =
    affiliation.name || affiliation.label || affiliation.importedText || ''
  const ids = orderedAffiliationIdentifiers(affiliation)

  return (
    <Box
      sx={{
        position: 'relative',
        border: '1px solid',
        borderColor: identified
          ? 'divider'
          : (theme) => theme.palette.warningOutline,
        backgroundColor: identified
          ? 'transparent'
          : (theme) => theme.palette.warningSurface,
        borderRadius: 1,
        p: 1.5,
        pr: readOnly ? 1.5 : 5,
      }}
    >
      {!readOnly && (
        <Tooltip
          title={t`documents_details_page_authors_tab_remove_affiliation`}
        >
          <IconButton
            size='small'
            disabled={disabled}
            onClick={() => onRemove(affiliation.localId)}
            sx={{ position: 'absolute', top: 4, right: 4 }}
          >
            <DeleteOutline fontSize='small' />
          </IconButton>
        </Tooltip>
      )}

      {identified ? (
        <>
          <Stack
            direction='row'
            spacing={1}
            alignItems='center'
            justifyContent='space-between'
          >
            <Stack
              direction='row'
              spacing={1}
              alignItems='center'
              sx={{ minWidth: 0 }}
            >
              <CheckCircle color='success' fontSize='small' />
              <Typography
                noWrap
                sx={{ color: 'primary.main', fontWeight: 700 }}
              >
                {name}
              </Typography>
            </Stack>
            <TextField
              select
              size='small'
              label={t`documents_details_page_authors_tab_affiliation_type_label`}
              value={affiliation.type ?? ''}
              disabled={disabled || readOnly}
              onChange={(event) =>
                onChangeType(
                  affiliation.localId,
                  (event.target.value || null) as HalAffiliationType | null,
                )
              }
              sx={{ flexShrink: 0, minWidth: 180, ml: 1, mr: readOnly ? 0 : 4 }}
            >
              <MenuItem value=''>
                <em>{t`documents_details_page_authors_tab_affiliation_type_none`}</em>
              </MenuItem>
              {HAL_AFFILIATION_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {halAffiliationTypeLabel(type)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <Stack
            direction='row'
            spacing={0.5}
            flexWrap='wrap'
            useFlexGap
            sx={{ mt: 0.5 }}
          >
            {ids.map((id) => (
              <Chip
                key={`${id.label}-${id.value}`}
                size='small'
                label={`${id.label} ${id.value}`}
                sx={{
                  border: 'none',
                  backgroundColor: (theme) =>
                    alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main',
                }}
              />
            ))}
          </Stack>
        </>
      ) : (
        <Stack spacing={1}>
          <Stack direction='row' spacing={0.5} alignItems='center'>
            <Warning color='warning' fontSize='small' />
            <Typography sx={{ fontWeight: 700, color: 'warning.dark' }}>
              {t`documents_details_page_authors_tab_missing_affiliation`}
            </Typography>
          </Stack>
          <Typography variant='body2'>
            <Typography
              component='span'
              sx={{ color: 'primary.main', fontWeight: 600 }}
            >
              {t`documents_details_page_authors_tab_imported_text`}
            </Typography>{' '}
            <em>&quot;{affiliation.importedText}&quot;</em>
          </Typography>
          {!readOnly && affiliation.importedText && (
            <AffiliationSuggestions
              importedText={affiliation.importedText}
              disabled={disabled}
              onAlign={(doc) => onSelectStructure(affiliation.localId, doc)}
            />
          )}
          {!readOnly && (
            <HalStructureAutocomplete
              disabled={disabled}
              onSelectStructure={(doc) =>
                onSelectStructure(affiliation.localId, doc)
              }
            />
          )}
        </Stack>
      )}
    </Box>
  )
}

export default AffiliationCard
