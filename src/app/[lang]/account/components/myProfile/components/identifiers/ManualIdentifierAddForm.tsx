'use client'

import { useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import useStore from '@/stores/global_store'
import { PersonIdentifierType } from '@/types/PersonIdentifier'

export type IdentifierVariant = {
  type: PersonIdentifierType
  /** Short label for the switcher toggle (e.g. "idHal_s"). */
  label: string
  regex: RegExp
}

type Props = {
  personUid: string
  /** One variant → no switcher; several → a switcher is shown at the line end. */
  variants: IdentifierVariant[]
  inputLabel: string
  onResult: (result: { success: boolean; conflict?: boolean }) => void
}

/**
 * Inline form to manually add a non-authenticated identifier (wide-scoped
 * editors). ORCID uses a single variant; idHAL passes both idHal_s / idHal_i as
 * variants, rendering a switcher that selects the submitted type and validation
 * regex — no format inference
 * (specs/872-refactor-account-edition-workflow/prompt.md).
 */
const ManualIdentifierAddForm = ({
  personUid,
  variants,
  inputLabel,
  onResult,
}: Props) => {
  const { addPersonIdentifier } = useStore((s) => s.user)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(0)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const variant = variants[selected] ?? variants[0]

  const reset = () => {
    setOpen(false)
    setValue('')
    setError(null)
    setSelected(0)
  }

  const save = async () => {
    const trimmed = value.trim()
    if (!variant.regex.test(trimmed)) {
      setError(t`manual_identifier_invalid_format`)
      return
    }
    setSaving(true)
    const result = await addPersonIdentifier(personUid, variant.type, trimmed)
    setSaving(false)
    if (result.success) reset()
    onResult(result)
  }

  if (!open) {
    return (
      <Button
        variant='outlined'
        startIcon={<AddIcon />}
        onClick={() => setOpen(true)}
        sx={{ minWidth: 'fit-content', alignSelf: 'flex-start' }}
      >
        <Trans>manual_identifier_add_button</Trans>
      </Button>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <TextField
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          error={!!error}
          helperText={error}
          label={inputLabel}
          size='small'
          sx={{ flexGrow: 1, minWidth: 180 }}
        />
        {variants.length > 1 && (
          <ToggleButtonGroup
            exclusive
            size='small'
            value={selected}
            onChange={(_e, next) => {
              if (next !== null) {
                setSelected(next)
                setError(null)
              }
            }}
          >
            {variants.map((v, i) => (
              <ToggleButton key={v.type} value={i}>
                {v.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button variant='outlined' onClick={reset}>
          <Trans>edit_field_cancel_button_label</Trans>
        </Button>
        <Button
          variant='contained'
          disableElevation
          disabled={saving}
          onClick={save}
          startIcon={
            saving ? <CircularProgress size={14} color='inherit' /> : undefined
          }
        >
          <Trans>manual_identifier_save_button</Trans>
        </Button>
      </Box>
    </Box>
  )
}

export default ManualIdentifierAddForm
