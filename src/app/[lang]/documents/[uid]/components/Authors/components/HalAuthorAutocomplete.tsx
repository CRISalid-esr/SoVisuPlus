import {
  Autocomplete,
  Box,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material'
import { t } from '@lingui/core/macro'
import { AureHalAuthorDoc } from '@/lib/services/AureHalAPIClient'
import { useDebouncedHalSearch } from '../hooks/useDebouncedHalSearch'

type AddOption = { kind: 'add' }
type DocOption = { kind: 'doc'; doc: AureHalAuthorDoc }
type Option = AddOption | DocOption

const stripUrl = (value: string) =>
  value
    .replace(/^https?:\/\/orcid\.org\//, '')
    .replace(/^https?:\/\/www\.idref\.fr\//, '')

const loadingOption = (
  <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
    <CircularProgress size={18} />
  </Box>
)

interface HalAuthorAutocompleteProps {
  disabled?: boolean
  onSelectProfile: (doc: AureHalAuthorDoc) => void
  onAddContributor: (inputText: string) => void
}

const HalAuthorAutocomplete = ({
  disabled,
  onSelectProfile,
  onAddContributor,
}: HalAuthorAutocompleteProps) => {
  const { input, setInput, loading, empty, error, results } =
    useDebouncedHalSearch<AureHalAuthorDoc>('/api/hal/authors')

  const hasQuery = input.trim().length >= 2
  // 'Add contributor' is only offered once results have loaded; while a request
  // is pending the option list is empty so the loading spinner shows instead.
  const options: Option[] =
    hasQuery && !loading
      ? [
          { kind: 'add' },
          ...results.map((doc) => ({ kind: 'doc' as const, doc })),
        ]
      : []

  const noOptionsText = !hasQuery
    ? t`documents_details_page_authors_tab_hal_min_chars`
    : error
      ? t`documents_details_page_authors_tab_hal_error`
      : empty
        ? t`documents_details_page_authors_tab_hal_no_results`
        : ''

  const handleChange = (_event: unknown, option: Option | null) => {
    if (!option) return
    if (option.kind === 'add') {
      onAddContributor(input.trim())
    } else {
      onSelectProfile(option.doc)
    }
    setInput('')
  }

  return (
    <Autocomplete<Option, false, false, false>
      size='small'
      disabled={disabled}
      options={options}
      filterOptions={(opts) => opts}
      value={null}
      inputValue={input}
      onInputChange={(_event, value) => setInput(value)}
      onChange={handleChange}
      loading={loading}
      loadingText={loadingOption}
      noOptionsText={noOptionsText}
      getOptionLabel={() => ''}
      isOptionEqualToValue={() => false}
      renderOption={(props, option, state) => {
        // Key by result position: HAL can return duplicate docs (same idHal/form),
        // so a content-derived key throws "duplicate key" in React.
        const key =
          option.kind === 'add' ? 'add-contributor' : `opt-${state.index}`
        if (option.kind === 'add') {
          return (
            <Box component='li' {...props} key={key}>
              <Typography fontStyle='italic'>
                {t`documents_details_page_authors_tab_hal_add_contributor`}
              </Typography>
            </Box>
          )
        }
        const { doc } = option
        const highlighted = Boolean(
          doc.idHal_s || doc.orcidId_s?.length || doc.idrefId_s?.length,
        )
        const parts = [
          doc.emailDomain_s?.length ? doc.emailDomain_s[0] : null,
          doc.idHal_s || null,
          doc.orcidId_s?.length ? stripUrl(doc.orcidId_s[0]) : null,
          doc.idrefId_s?.length ? `IdRef: ${stripUrl(doc.idrefId_s[0])}` : null,
        ].filter(Boolean)
        return (
          <Box component='li' {...props} key={key}>
            <Box>
              <Typography
                component='span'
                fontWeight={highlighted ? 700 : 400}
                color={highlighted ? 'primary.main' : 'textPrimary'}
              >
                {doc.fullName_s}
              </Typography>
              {parts.length > 0 && (
                <Typography
                  variant='caption'
                  color='textSecondary'
                  component='div'
                >
                  {parts.join(' · ')}
                </Typography>
              )}
            </Box>
          </Box>
        )
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={t`documents_details_page_authors_tab_hal_search_placeholder`}
          sx={{ backgroundColor: 'background.default' }}
        />
      )}
    />
  )
}

export default HalAuthorAutocomplete
