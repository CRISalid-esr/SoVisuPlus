'use client'

import { t } from '@lingui/core/macro'
import * as Lingui from '@lingui/core'
import { Box, Chip, Typography } from '@mui/material'
import { nationalTypeLabel } from '@/app/[lang]/components/organizationTypeLabels'
import { StructureRow } from './directoryRows'

/**
 * Structure cell shared by the flat and hierarchical tables: acronym +
 * translated national-type chip + full name; muted external and hidden
 * variants (hidden rows only reach the tables for a structure manager who
 * turned the "show hidden" switch on).
 */
const StructureNameCell = ({
  row,
  onNavigate,
}: {
  row: StructureRow
  onNavigate: (row: StructureRow) => void
}) => {
  const typeLabel = nationalTypeLabel(Lingui.i18n, row.nationalType)

  return (
    <Box
      sx={{
        cursor: 'pointer',
        ...(row.external || row.hiddenEffective ? { opacity: 0.75 } : {}),
      }}
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
        {row.hiddenEffective && (
          <Chip
            label={t`research_structures_chip_hidden`}
            size='small'
            variant='outlined'
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
