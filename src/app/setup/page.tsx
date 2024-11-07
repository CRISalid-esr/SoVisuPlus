// app/setup/page.tsx
import { PrismaClient } from '@prisma/client'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Checkbox,
  Divider,
  Paper,
  Slider,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import {
  CheckBox,
  CheckBoxOutlineBlank,
  ToggleOff,
  ToggleOn,
} from '@mui/icons-material'

const prisma = new PrismaClient()

export const metadata = {
  title: 'Setup checks Checks',
  description: 'Setup checks for the application',
}

export default async function SetupChecks() {
  let dbStatus

  try {
    await prisma.$queryRaw`SELECT 1`
    dbStatus = 'connected'
  } catch (error) {
    dbStatus = 'not connected'
    console.log(error)
  }

  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant='h4' component='h1' gutterBottom>
        App setup Checks
      </Typography>

      <Paper sx={{ padding: 2, marginTop: 2 }}>
        <Typography variant='h6'>Database Status</Typography>
        <Alert severity={dbStatus === 'connected' ? 'success' : 'error'}>
          {dbStatus === 'connected'
            ? 'Database is accessible'
            : 'Database is not accessible'}
        </Alert>
      </Paper>

      <Paper sx={{ padding: 2, marginTop: 2 }}>
        <Typography variant='h6'>MUI Preview</Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            marginTop: 2,
          }}
        >
          <Card variant='outlined'>
            <CardContent>
              <Typography variant='h5' component='div'>
                Card Component
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                This is a sample card component with content.
              </Typography>
            </CardContent>
            <CardActions>
              <Button size='small'>Action 1</Button>
              <Button size='small'>Action 2</Button>
            </CardActions>
          </Card>

          <Divider />

          <Typography variant='h6'>Buttons</Typography>
          <Button variant='contained' color='primary'>
            Primary Button
          </Button>
          <Button variant='outlined' color='secondary'>
            Secondary Button
          </Button>

          <Divider />

          <Typography variant='h6'>Alerts</Typography>
          <Alert severity='info'>This is an informational alert</Alert>
          <Alert severity='warning'>This is a warning alert</Alert>
          <Alert severity='success'>This is a success alert</Alert>
          <Alert severity='error'>This is an error alert</Alert>

          <Divider />

          <Typography variant='h6'>Form Controls</Typography>
          <TextField label='Text Input' variant='outlined' />
          <Slider
            defaultValue={50}
            aria-label='Default'
            valueLabelDisplay='auto'
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Checkbox
              icon={<CheckBoxOutlineBlank />}
              checkedIcon={<CheckBox />}
            />
            <Switch
              icon={<ToggleOff />}
              checkedIcon={<ToggleOn />}
              defaultChecked
            />
          </Box>
        </Box>
      </Paper>
    </Box>
  )
}
