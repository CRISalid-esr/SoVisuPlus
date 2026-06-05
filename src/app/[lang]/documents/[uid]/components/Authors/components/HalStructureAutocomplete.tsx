import {
  Autocomplete,
  Box,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material'
import { t } from '@lingui/core/macro'
import { AureHalStructureDoc } from '@/lib/services/AureHalAPIClient'
import { useDebouncedHalSearch } from '../hooks/useDebouncedHalSearch'
import {
  orderStructureDocs,
  structureValidityStyle,
} from '../lib/structureResults'
import { halStructureToAffiliation } from '../lib/halMapping'
import { orderedAffiliationIdentifiers } from '../lib/affiliationDisplay'

interface HalStructureAutocompleteProps {
  disabled?: boolean
  onSelectStructure: (doc: AureHalStructureDoc) => void
}

const loadingOption = (
  <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
    <CircularProgress size={18} />
  </Box>
)

const HalStructureAutocomplete = ({
  disabled,
  onSelectStructure,
}: HalStructureAutocompleteProps) => {
  const { input, setInput, loading, empty, error, results } =
    useDebouncedHalSearch<AureHalStructureDoc>('/api/hal/structures')

  const hasQuery = input.trim().length >= 2
  const options = hasQuery ? orderStructureDocs(results) : []

  const noOptionsText = !hasQuery
    ? t`documents_details_page_authors_tab_hal_min_chars`
    : error
      ? t`documents_details_page_authors_tab_hal_error`
      : empty
        ? t`documents_details_page_authors_tab_hal_not_found`
        : ''

  return (
    <Autocomplete<AureHalStructureDoc, false, false, false>
      size='small'
      disabled={disabled}
      options={options}
      filterOptions={(opts) => opts}
      value={null}
      inputValue={input}
      onInputChange={(_event, value) => setInput(value)}
      onChange={(_event, doc) => {
        if (!doc) return
        onSelectStructure(doc)
        setInput('')
      }}
      loading={loading}
      loadingText={loadingOption}
      noOptionsText={noOptionsText}
      getOptionLabel={() => ''}
      isOptionEqualToValue={() => false}
      renderOption={(props, doc) => {
        const name = doc.name_s || doc.label_s || ''
        const hasRor = Boolean(doc.ror_s && doc.ror_s.length > 0)
        const validityStyle = structureValidityStyle(doc)
        const inlineIds = orderedAffiliationIdentifiers(
          halStructureToAffiliation(doc),
        )
          .map((id) => `${id.label}: ${id.value}`)
          .join(' ')
        return (
          <Box
            component='li'
            {...props}
            key={`${doc.docid}-${doc.valid_s ?? ''}`}
          >
            <Box>
              <Typography
                component='span'
                sx={{
                  color: hasRor ? 'primary.main' : validityStyle.color,
                  fontWeight: hasRor ? 700 : validityStyle.fontWeight,
                }}
              >
                {name}
              </Typography>
              <Typography
                variant='caption'
                color='textSecondary'
                component='div'
              >
                {doc.acronym_s ? `${doc.acronym_s} ` : ''}
                {inlineIds}
              </Typography>
            </Box>
          </Box>
        )
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={t`documents_details_page_authors_tab_hal_structure_placeholder`}
        />
      )}
    />
  )
}

export default HalStructureAutocomplete
