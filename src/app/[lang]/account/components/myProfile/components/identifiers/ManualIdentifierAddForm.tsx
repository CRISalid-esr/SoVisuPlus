'use client'

import { ReactNode, useState } from 'react'
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

export type IdentifierPreviewArgs = {
  value: string
  type: PersonIdentifierType
  onReady: () => void
}

type Props = {
  personUid: string
  /** One variant → no switcher; several → a switcher is shown at the line end. */
  variants: IdentifierVariant[]
  inputLabel: string
  onResult: (result: { success: boolean; conflict?: boolean }) => void
  /**
   * Optional confirmation step. When provided, the user must Verify before Save:
   * the returned preview is rendered and Save stays disabled until it calls
   * `onReady` (mirrors the IdRef verify flow). Used to preview the AureHAL author
   * behind a manually entered idHAL.
   */
  renderPreview?: (args: IdentifierPreviewArgs) => ReactNode
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
  renderPreview,
}: Props) => {
  const { addPersonIdentifier } = useStore((s) => s.user)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(0)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Verify step (only when renderPreview is provided)
  const [verifying, setVerifying] = useState(false)
  const [canConfirm, setCanConfirm] = useState(false)
  const [verifyingValue, setVerifyingValue] = useState('')

  const variant = variants[selected] ?? variants[0]

  const reset = () => {
    setOpen(false)
    setValue('')
    setError(null)
    setSelected(0)
    setVerifying(false)
    setCanConfirm(false)
  }

  const clearVerify = () => {
    if (verifying) {
      setVerifying(false)
      setCanConfirm(false)
    }
  }

  const validate = (v: string): boolean => {
    if (!variant.regex.test(v)) {
      setError(t`manual_identifier_invalid_format`)
      return false
    }
    return true
  }

  const verify = () => {
    const trimmed = value.trim()
    if (!validate(trimmed)) return
    setVerifyingValue(trimmed)
    setCanConfirm(false)
    setVerifying(true)
  }

  const save = async () => {
    const trimmed = renderPreview ? verifyingValue : value.trim()
    if (!renderPreview && !validate(trimmed)) return
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

  const showSave = !renderPreview || verifying

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
            clearVerify()
          }}
          error={!!error}
          helperText={error}
          label={inputLabel}
          size='small'
          disabled={verifying}
          sx={{ flexGrow: 1, minWidth: 180 }}
        />
        {variants.length > 1 && (
          <ToggleButtonGroup
            exclusive
            size='small'
            value={selected}
            disabled={verifying}
            onChange={(_e, next) => {
              if (next !== null) {
                setSelected(next)
                setError(null)
                clearVerify()
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

      {renderPreview &&
        verifying &&
        renderPreview({
          value: verifyingValue,
          type: variant.type,
          onReady: () => setCanConfirm(true),
        })}

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button variant='outlined' onClick={reset}>
          <Trans>edit_field_cancel_button_label</Trans>
        </Button>
        {!showSave ? (
          <Button variant='contained' disableElevation onClick={verify}>
            <Trans>manual_identifier_verify_button</Trans>
          </Button>
        ) : (
          <Button
            variant='contained'
            disableElevation
            disabled={saving || (!!renderPreview && !canConfirm)}
            onClick={save}
            startIcon={
              saving ? (
                <CircularProgress size={14} color='inherit' />
              ) : undefined
            }
          >
            <Trans>manual_identifier_save_button</Trans>
          </Button>
        )}
      </Box>
    </Box>
  )
}

export default ManualIdentifierAddForm
