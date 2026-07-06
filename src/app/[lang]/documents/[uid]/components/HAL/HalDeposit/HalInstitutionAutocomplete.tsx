'use client'
import { useEffect, useRef } from 'react'
import { Autocomplete, Box, CircularProgress, TextField } from '@mui/material'
import { t } from '@lingui/core/macro'
import { useDebouncedHalSearch } from '../../Authors/hooks/useDebouncedHalSearch'

/** One institution facet value proxied by `/api/hal/institutions`. */
type InstitutionDoc = { value: string }

interface HalInstitutionAutocompleteProps {
  /** Currently stored institution name (plain string). */
  value: string | null
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  label?: string
  placeholder?: string
  error?: boolean
}

const loadingOption = (
  <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
    <CircularProgress size={18} />
  </Box>
)

/**
 * Autocomplete for the REPORT institution / THESE-HDR issuing body, backed by the HAL
 * `authorityInstitution_s` facet. Free-solo, so a typed value the facet does not surface is
 * still accepted. The selected string is stored on the deposit and emitted to
 * `monogr/authority[@type="institution"]`.
 */
const HalInstitutionAutocomplete = ({
  value,
  onChange,
  disabled,
  required,
  label,
  placeholder,
  error,
}: HalInstitutionAutocompleteProps) => {
  const {
    input,
    setInput,
    loading,
    empty,
    error: searchError,
    results,
  } = useDebouncedHalSearch<InstitutionDoc>('/api/hal/institutions')

  // Seed the visible input from an already-stored value once (e.g. a prefilled field).
  const seeded = useRef(false)
  useEffect(() => {
    if (!seeded.current && value) {
      setInput(value)
      seeded.current = true
    }
  }, [value, setInput])

  const hasQuery = input.trim().length >= 2
  const options = hasQuery ? results.map((r) => r.value) : []

  const noOptionsText = !hasQuery
    ? t`documents_details_page_authors_tab_hal_min_chars`
    : searchError
      ? t`documents_details_page_authors_tab_hal_error`
      : empty
        ? t`documents_details_page_authors_tab_hal_not_found`
        : ''

  return (
    <Autocomplete<string, false, false, true>
      freeSolo
      size='small'
      disabled={disabled}
      options={options}
      filterOptions={(opts) => opts}
      value={value ?? null}
      inputValue={input}
      onInputChange={(_event, next, reason) => {
        setInput(next)
        // Typing directly edits the stored value; picking an option is handled by onChange.
        if (reason === 'input') onChange(next)
      }}
      onChange={(_event, next) => {
        onChange(typeof next === 'string' ? next : '')
      }}
      loading={loading}
      loadingText={loadingOption}
      noOptionsText={noOptionsText}
      renderInput={(params) => (
        <TextField
          {...params}
          required={required}
          error={error}
          label={label}
          placeholder={placeholder}
        />
      )}
    />
  )
}

export default HalInstitutionAutocomplete
