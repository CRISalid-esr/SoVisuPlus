'use client'
import { Trans } from '@lingui/macro'
import {
  Box,
  Button,
  Container,
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from '@mui/material'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Props = {
  params: { lang: string }
}

export default function Home({ params }: Props) {
  const { lang } = params

  const router = useRouter()

  const handleChange = (event: SelectChangeEvent) => {
    router.push(`/${event.target.value}`)
  }

  return (
    <Container maxWidth='sm' sx={{ textAlign: 'center', mt: 8 }}>
      <Box sx={{ mb: 4 }}>
        <Image
          src='/crisalid.png'
          alt='Crisalid logo'
          width={100}
          height={100}
          priority
        />
      </Box>
      <Typography variant='h4' component='h1' gutterBottom>
        SoVisu+
      </Typography>
      <FormControl variant='filled' sx={{ m: 1, minWidth: 120 }}>
        <Select
          labelId='demo-simple-select-filled-label'
          id='demo-simple-select-filled'
          value={lang}
          onChange={handleChange}
        >
          <MenuItem value='en'>English</MenuItem>
          <MenuItem value='fr'>Français</MenuItem>
        </Select>
      </FormControl>
      <Typography variant='h4' component='h1' gutterBottom>
        <Trans>home_page_main_title</Trans>
      </Typography>
      <Typography variant='subtitle1' gutterBottom>
        <Trans>home_page_subtitle</Trans>
      </Typography>
      <Typography variant='body2' color='textSecondary' sx={{ mb: 4 }}>
        Development instance
      </Typography>
      <Box sx={{ mt: 4 }}>
        <Link href={`/${lang}/setup`} passHref>
          <Button variant='contained' color='primary'>
            Application Health Checkup
          </Button>
        </Link>
      </Box>
    </Container>
  )
}
