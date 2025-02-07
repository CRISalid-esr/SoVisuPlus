import Button from '@/app/theme/overrides/Button'
import { CardActions, CardContent, Typography } from '@mui/material'

export default function NotificationPage() {
  return (
    <>
      <CardContent>
        <Typography gutterBottom sx={{ color: 'text.secondary', fontSize: 14 }}>
          Word of the Day
        </Typography>
        <Typography variant='h5' component='div'>
          lorem
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>
          adjective
        </Typography>
        <Typography variant='body2'>
          well meaning and kindly.
          <br />
          {'"a benevolent smile"'}
        </Typography>
      </CardContent>
    </>
  )
}
