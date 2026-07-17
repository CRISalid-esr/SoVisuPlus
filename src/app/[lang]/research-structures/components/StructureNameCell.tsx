'use client'

import { t } from '@lingui/core/macro'
import * as Lingui from '@lingui/core'
import CallMadeIcon from '@mui/icons-material/CallMade'
import { Box, Chip, Typography } from '@mui/material'
import { nationalTypeLabel } from '@/app/[lang]/components/organizationTypeLabels'
import { StructureRow } from './directoryRows'

/**
 * Structure cell shared by the flat and hierarchical tables: acronym +
 * translated national-type chip + full name; dimmed reference variant for
 * secondary placements in the hierarchical view; muted external variant.
 */
const StructureNameCell = ({
  row,
  onNavigate,
}: {
  row: StructureRow
  onNavigate: (row: StructureRow) => void
}) => {
  const typeLabel = nationalTypeLabel(Lingui.i18n, row.nationalType)

  if (row.isReference) {
    return (
      <Box
        sx={{ cursor: 'pointer', opacity: 0.65 }}
        onClick={() => onNavigate(row)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CallMadeIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
          <Typography
            variant='body2'
            fontStyle='italic'
            color='text.secondary'
            sx={{ '&:hover': { textDecoration: 'underline' } }}
          >
            {row.acronym}
          </Typography>
          {typeLabel && (
            <Chip
              label={typeLabel}
              size='small'
              sx={{ height: 14, fontSize: 10 }}
            />
          )}
          <Chip
            label={
              row.referenceKind === 'co_supervision'
                ? t`research_structures_chip_co_supervision`
                : t`research_structures_chip_attachment`
            }
            size='small'
            variant='outlined'
            sx={{ height: 14, fontSize: 10, borderStyle: 'dashed' }}
          />
        </Box>
        <Typography
          variant='caption'
          color='text.disabled'
          fontStyle='italic'
          sx={{
            display: 'block',
            maxWidth: 320,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row.name}
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{ cursor: 'pointer', ...(row.external ? { opacity: 0.75 } : {}) }}
      onClick={() => onNavigate(row)}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          flexWrap: 'wrap',
        }}
      >
        <Typography
          variant='body2'
          fontWeight='bold'
          color={row.external ? 'text.secondary' : 'primary'}
          sx={{ '&:hover': { textDecoration: 'underline' } }}
        >
          {row.acronym}
        </Typography>
        {typeLabel && (
          <Chip
            label={typeLabel}
            size='small'
            sx={{ height: 16, fontSize: 10 }}
          />
        )}
        {row.external && (
          <Chip
            label={t`research_structures_chip_external`}
            size='small'
            variant='outlined'
            color='warning'
            sx={{ height: 16, fontSize: 10 }}
          />
        )}
      </Box>
      <Typography
        variant='caption'
        color='text.secondary'
        sx={{
          display: 'block',
          maxWidth: 320,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {row.name}
      </Typography>
    </Box>
  )
}

export default StructureNameCell
