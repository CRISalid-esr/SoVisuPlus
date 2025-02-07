import { CardActions, CardContent, Typography ,Button} from '@mui/material'
import { CustomCard } from '@/components/Card'
import { Box } from '@mui/system'

export default function NotificationPage() {
  return (
    <Box >
     <CustomCard header={<Typography variant="h4">Notification</Typography>}>
        <CardContent>
          <Typography variant="h5">Notification</Typography>
        </CardContent>
        <CardActions>
          <Button>Click me</Button>
        </CardActions>
      </CustomCard>
    </Box>
  )
}
