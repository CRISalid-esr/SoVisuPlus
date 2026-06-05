import {
  Box,
  Chip,
  IconButton,
  Stack,
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
}

const AffiliationCard = ({
  affiliation,
  disabled,
  readOnly,
  onRemove,
  onSelectStructure,
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
          <Stack direction='row' spacing={1} alignItems='center'>
            <CheckCircle color='success' fontSize='small' />
            <Typography sx={{ color: 'primary.main', fontWeight: 700 }}>
              {name}
            </Typography>
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
