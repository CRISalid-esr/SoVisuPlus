import { CustomCard } from '@/components/Card'
import { Trans } from '@lingui/react'
import {
  CardContent,
  Checkbox,
  FormControlLabel,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Box } from '@mui/system'

const NotificationPage = () => {
  const theme = useTheme()
  return (
    <Box>
      <CustomCard
        header={
          <Typography
            sx={{
              color: theme.palette.primary.main,
              fontSize: theme.utils.pxToRem(20),
              fontStyle: 'normal',
              fontWeight: theme.typography.fontWeightRegular,
              lineHeight: 'normal',
            }}
          >
            <Trans id='notification_page_notification_title' />
          </Typography>
        }
      >
        <CardContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: theme.spacing(4),
          }}
        >
          <Typography
            sx={{
              fontSize: theme.utils.pxToRem(16),
              fontStyle: 'normal',
              fontWeight: theme.typography.fontWeightMedium,
              lineHeight: theme.typography.lineHeight.lineHeight24px,
              letterSpacing: '0.5px',
              color: theme.palette.textSecondary,
            }}
          >
            <Trans id='notification_page_description' />
          </Typography>
          <FormControlLabel
            control={<Checkbox defaultChecked />}
            label={<Trans id='notification_page_new_publication_referenced' />}
          />
          <FormControlLabel
            control={<Checkbox defaultChecked />}
            label={
              <Trans id='notification_page_new_expertise_awaiting_validation' />
            }
          />
        </CardContent>
      </CustomCard>
    </Box>
  )
}
export default NotificationPage
