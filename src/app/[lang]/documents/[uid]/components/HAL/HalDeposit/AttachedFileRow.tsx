'use client'

import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react'
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from '@mui/material'
import { AttachFile, Close, CloudUpload } from '@mui/icons-material'
import { OptionLabel } from './halDepositOptions'

export type AttachedFile = {
  file: File
  source: string
  kind: string
  visibility: string
  license: string
}

type Option = { value: string; label: OptionLabel }

interface Props {
  file: AttachedFile | null
  onSelect?: (file: File) => void
  onChange: (patch: Partial<AttachedFile>) => void
  onRemove: () => void
  requireLicense?: boolean
  /** Main file rows use a teal surface; complementary files use a neutral grey. */
  isMain?: boolean
  accept?: string
  sourceOptions: Option[]
  typeOptions: Option[]
  visibilityOptions: Option[]
  licenseOptions: Option[]
}

/** Human-readable file size (e.g. "1.2 MB"). */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * One attachment row: a file picker when empty (main file), or the file name plus the four HAL
 * per-file selectors (source, type, visibility, licence) when populated.
 */
export function AttachedFileRow({
  file,
  onSelect,
  onChange,
  onRemove,
  requireLicense,
  isMain,
  accept,
  sourceOptions,
  typeOptions,
  visibilityOptions,
  licenseOptions,
}: Props) {
  if (!file) {
    return (
      <Button component='label' variant='outlined' startIcon={<CloudUpload />}>
        <Trans>hal_deposit_file_choose</Trans>
        <input
          type='file'
          hidden
          accept={accept}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f && onSelect) onSelect(f)
          }}
        />
      </Button>
    )
  }

  return (
    <Paper
      elevation={0}
      sx={{ p: 2, mb: 1, borderRadius: 2, bgcolor: isMain ? '#E8F5F4' : '#F5F7F6' }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AttachFile fontSize='small' sx={{ color: isMain ? '#006A61' : '#6F7977' }} />
          <Box>
            <Typography sx={{ fontWeight: 500, color: isMain ? '#006A61' : undefined }}>
              {file.file.name}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {formatFileSize(file.file.size)}
            </Typography>
          </Box>
        </Box>
        <IconButton size='small' onClick={onRemove} aria-label={t`hal_deposit_file_remove`}>
          <Close fontSize='small' />
        </IconButton>
      </Box>
      <Box
        sx={{
          mt: 1.5,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 1.5,
        }}
      >
        <Selector
          label={`${t`hal_deposit_file_source`} *`}
          value={file.source}
          options={sourceOptions}
          onChange={(v) => onChange({ source: v })}
        />
        <Selector
          label={`${t`hal_deposit_file_type`} *`}
          value={file.kind}
          options={typeOptions}
          onChange={(v) => onChange({ kind: v })}
        />
        <Selector
          label={`${t`hal_deposit_file_visibility`} *`}
          value={file.visibility}
          options={visibilityOptions}
          onChange={(v) => onChange({ visibility: v })}
        />
        <Selector
          label={requireLicense ? t`hal_deposit_file_license_required` : t`hal_deposit_file_license`}
          value={file.license}
          options={licenseOptions}
          error={requireLicense && !file.license}
          onChange={(v) => onChange({ license: v })}
        />
      </Box>
    </Paper>
  )
}

function Selector({
  label,
  value,
  options,
  onChange,
  error,
}: {
  label: string
  value: string
  options: Option[]
  onChange: (v: string) => void
  error?: boolean
}) {
  const { _ } = useLingui()
  return (
    <FormControl size='small' fullWidth error={error}>
      <InputLabel>{label}</InputLabel>
      <Select value={value} label={label} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {typeof o.label === 'string' ? o.label : _(o.label)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
