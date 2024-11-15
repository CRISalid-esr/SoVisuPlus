'use client';
import Image from 'next/image'
import { Box, Typography, Container, Button } from '@mui/material'
import Link from 'next/link'

export default function Home({ params }: { params: { lang: string } }) {
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
      <Typography variant='subtitle1' gutterBottom>
        A Comprehensive App for Managing Scientific Output and Researcher
        Identifiers
        </Typography> 
      <Typography variant='body2' color='textSecondary' sx={{ mb: 4 }}>
        Development instance
      </Typography>
      <Box sx={{ mt: 4 }}>
        <Link href={`/${params.lang}/setup`} passHref>
          <Button variant='contained' color='primary'>
            Application Health Checkup
          </Button>
        </Link>
      </Box>
    </Container>
  )
}
