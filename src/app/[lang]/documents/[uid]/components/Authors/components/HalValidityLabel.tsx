import { Typography } from '@mui/material'
import { t } from '@lingui/core/macro'

/** Colored PREFERRED/INCOMING validity label for a HAL author profile. */
const HalValidityLabel = ({ validity }: { validity?: string }) => {
  if (validity !== 'PREFERRED' && validity !== 'INCOMING') return null
  const isPreferred = validity === 'PREFERRED'
  return (
    <Typography
      variant='caption'
      sx={{ color: isPreferred ? 'success.main' : 'info.main', fontWeight: 700 }}
    >
      {isPreferred
        ? t`documents_details_page_authors_tab_hal_validity_preferred`
        : t`documents_details_page_authors_tab_hal_validity_incoming`}
    </Typography>
  )
}

export default HalValidityLabel
