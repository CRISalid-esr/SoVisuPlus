import { Box, Button, Stack, Typography } from '@mui/material'
import { Save, Warning } from '@mui/icons-material'
import { t } from '@lingui/core/macro'

interface UnsavedBannerProps {
  saving?: boolean
  onSave: () => void
  onCancel: () => void
}

const UnsavedBanner = ({ saving, onSave, onCancel }: UnsavedBannerProps) => (
  <Box
    sx={{
      position: 'sticky',
      top: 0,
      zIndex: 1100,
      mb: 2,
      py: 1,
      px: 2,
      borderRadius: 1,
      backgroundColor: 'background.default',
      borderLeft: '6px solid',
      borderLeftColor: 'warning.light',
    }}
  >
    <Stack
      direction='row'
      alignItems='center'
      justifyContent='space-between'
      spacing={2}
      flexWrap='wrap'
    >
      <Stack direction='row' spacing={1} alignItems='center'>
        <Warning color='warning' fontSize='small' />
        <Typography variant='body2'>
          {t`documents_details_page_authors_tab_unsaved_changes`}
        </Typography>
      </Stack>
      <Stack direction='row' spacing={1} alignItems='center'>
        <Button
          size='small'
          variant='text'
          startIcon={<Save />}
          onClick={onSave}
          disabled={saving}
          sx={{ color: 'primary.main', fontWeight: 700 }}
        >
          {t`documents_details_page_authors_tab_save`}
        </Button>
        <Button size='small' onClick={onCancel} disabled={saving}>
          {t`documents_details_page_authors_tab_cancel`}
        </Button>
      </Stack>
    </Stack>
  </Box>
)

export default UnsavedBanner
