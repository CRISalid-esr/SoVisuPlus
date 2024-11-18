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
import StoreChecker from '@/components/StoreChecker'
import React from 'react'
import { dbCheckup } from 'src/app/lib/db_checkup'
import Image from 'next/image'
import { Grid } from '@mui/system'
import Link from 'next/link'

export const metadata = {
  title: 'Setup Checks',
  description: 'Setup checks for the application',
}

export default async function SetupChecks() {
  const { dbStatus, dbError } = await dbCheckup()

  return (
    <Box sx={{ padding: 4 }}>
      <Grid container spacing={3}>
        <Grid size={12}>
          <Link href='/' passHref>
            <Button variant='contained' color='primary' sx={{ mb: 2 }}>
              Back to Home
            </Button>
          </Link>
        </Grid>
        <Grid size={8}>
          <Typography variant='h4' component='h1' gutterBottom>
            Setup Checks
          </Typography>

          <Card variant='outlined' sx={{ marginBottom: 2 }}>
            <CardContent>
              <Typography variant='h5' component='div'>
                Deployment |{' '}
                <Image
                  src='/docker.svg'
                  alt='Docker logo'
                  style={{ marginLeft: 10, verticalAlign: 'middle' }}
                  width={40}
                  height={40}
                />{' '}
                Docker
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Display Docker environment variables for the application setup
              </Typography>
              <Box sx={{ marginTop: 2 }}>
                <Typography variant='body1'>
                  <strong>DOCKER_IMAGE:</strong>{' '}
                  {process.env.DOCKER_IMAGE || 'Not Set'}
                </Typography>
                <Typography variant='body1'>
                  <strong>DOCKER_TAG:</strong>{' '}
                  {process.env.DOCKER_TAG || 'Not Set'}
                </Typography>
                <Typography variant='body1'>
                  <strong>DOCKER_DIGEST:</strong>{' '}
                  {process.env.DOCKER_DIGEST || 'Not Set'}
                </Typography>
                <Typography variant='body1'>
                  <strong>GIT_BRANCH:</strong>{' '}
                  {process.env.GIT_BRANCH || 'Not Set'}
                </Typography>
                <Typography variant='body1'>
                  <strong>GIT_COMMIT:</strong>{' '}
                  {process.env.GIT_COMMIT || 'Not Set'}
                </Typography>
              </Box>
            </CardContent>
            <CardActions>
              <Alert severity='success'>
                Docker environment variables loaded for application setup.
              </Alert>
            </CardActions>
          </Card>

          <Card variant='outlined' sx={{ marginBottom: 2 }}>
            <CardContent>
              <Typography variant='h5' component='div'>
                Database Checkup |{' '}
                <Image
                  src='/prisma.svg'
                  alt='Database logo'
                  style={{ marginLeft: 10, verticalAlign: 'middle' }}
                  width={100}
                  height={100}
                />
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Query the database server to check if it is accessible
              </Typography>
            </CardContent>
            <CardActions>
              <Alert severity={dbStatus === 'connected' ? 'success' : 'error'}>
                {dbStatus === 'connected'
                  ? 'Database is accessible'
                  : 'Database is not accessible: ' + dbError?.message}
              </Alert>
            </CardActions>
          </Card>

          <Card variant='outlined'>
            <CardContent>
              <Typography variant='h5' component='div'>
                State Management |{' '}
                <Image
                  src='/zustand.png'
                  alt='Zustand logo'
                  style={{ marginLeft: 10, verticalAlign: 'middle' }}
                  width={30}
                  height={30}
                />{' '}
                Zustand
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Load data from database into app global state
              </Typography>
            </CardContent>
            <CardActions>
              <StoreChecker />
            </CardActions>
          </Card>
        </Grid>

        <Grid size={4}>
          <Paper sx={{ padding: 3 }}>
            <Typography variant='h5' gutterBottom>
              MUI Preview
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                marginTop: 2,
              }}
            >
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
        </Grid>
      </Grid>
    </Box>
  )
}
