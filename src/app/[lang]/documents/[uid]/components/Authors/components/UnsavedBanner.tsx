import { Alert, Button, Stack } from '@mui/material'
import { t } from '@lingui/core/macro'

interface UnsavedBannerProps {
  saving?: boolean
  onSave: () => void
  onCancel: () => void
}

const UnsavedBanner = ({ saving, onSave, onCancel }: UnsavedBannerProps) => (
  <Alert
    severity='warning'
    sx={{ mb: 2 }}
    action={
      <Stack direction='row' spacing={1}>
        <Button
          color='inherit'
          size='small'
          onClick={onCancel}
          disabled={saving}
        >
          {t`documents_details_page_authors_tab_cancel`}
        </Button>
        <Button
          color='inherit'
          size='small'
          variant='outlined'
          onClick={onSave}
          disabled={saving}
        >
          {t`documents_details_page_authors_tab_save`}
        </Button>
      </Stack>
    }
  >
    {t`documents_details_page_authors_tab_unsaved_changes`}
  </Alert>
)

export default UnsavedBanner
