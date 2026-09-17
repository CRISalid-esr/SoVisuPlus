'use client'

import { t } from '@lingui/core/macro'
import { Button, ButtonProps } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { StructureRow } from './directoryRows'

const DashboardLinkButton = ({
  row,
  onNavigate,
  ...buttonProps
}: {
  row: StructureRow
  onNavigate: (row: StructureRow) => void
} & Omit<ButtonProps, 'onClick' | 'disabled'>) => {
  if (!row.slug) {
    return null
  }
  return (
    <Button
      {...buttonProps}
      disabled={row.hiddenEffective}
      onClick={() => onNavigate(row)}
      sx={[
        {
          '&.Mui-disabled': {
            color: 'primary.main',
            borderColor: (theme) => alpha(theme.palette.primary.main, 0.5),
          },
        },
        ...(Array.isArray(buttonProps.sx) ? buttonProps.sx : [buttonProps.sx]),
      ]}
    >
      {t`research_structures_dashboard_link`}
    </Button>
  )
}

export default DashboardLinkButton
