import { Chip, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { CheckCircle, Info, WarningAmber } from '@mui/icons-material'
import { t } from '@lingui/core/macro'
import { ContributionStatus } from '../lib/types'

function statusLabel(status: ContributionStatus): string {
  switch (status) {
    case 'identified_and_aligned':
      return t`documents_details_page_authors_tab_status_identified_and_aligned`
    case 'identified':
      return t`documents_details_page_authors_tab_status_identified`
    case 'not_aligned':
      return t`documents_details_page_authors_tab_status_not_aligned`
    case 'not_identified':
      return t`documents_details_page_authors_tab_status_not_identified`
  }
}

const ContributionStatusChip = ({ status }: { status: ContributionStatus }) => {
  // Identified / aligned: no border, bold label in the default font color.
  if (status === 'identified' || status === 'identified_and_aligned') {
    return (
      <Stack direction='row' spacing={0.5} alignItems='center'>
        <CheckCircle color='success' fontSize='small' />
        <Typography variant='body2' sx={{ fontWeight: 700 }}>
          {statusLabel(status)}
        </Typography>
      </Stack>
    )
  }

  // Not identified: light-orange filled chip with an outlined warning icon.
  if (status === 'not_identified') {
    return (
      <Chip
        size='small'
        icon={<WarningAmber fontSize='small' />}
        label={statusLabel(status)}
        sx={{
          backgroundColor: (theme) => alpha(theme.palette.warning.main, 0.15),
          color: 'warning.dark',
          border: 'none',
          '& .MuiChip-icon': { color: 'warning.main' },
        }}
      />
    )
  }

  // Not aligned: info chip.
  return (
    <Chip
      size='small'
      variant='outlined'
      color='info'
      icon={<Info fontSize='small' />}
      label={statusLabel(status)}
    />
  )
}

export default ContributionStatusChip
