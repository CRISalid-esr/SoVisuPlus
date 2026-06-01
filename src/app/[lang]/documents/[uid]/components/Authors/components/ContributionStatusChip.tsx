import { Chip } from '@mui/material'
import { t } from '@lingui/core/macro'
import { ContributionStatus } from '../lib/types'

const STATUS_COLOR: Record<ContributionStatus, 'success' | 'info' | 'warning'> =
  {
    identified_and_aligned: 'success',
    identified: 'success',
    not_aligned: 'info',
    not_identified: 'warning',
  }

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

const ContributionStatusChip = ({ status }: { status: ContributionStatus }) => (
  <Chip
    size='small'
    variant='outlined'
    color={STATUS_COLOR[status]}
    label={statusLabel(status)}
  />
)

export default ContributionStatusChip
