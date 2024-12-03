import { Box, Container, Typography } from '@mui/material'
import Image from 'next/image'
import LoginButton from '@/components/auth/LoginButton'
import { getServerSession } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import LogoutButton from '@/components/auth/LogoutButton'
import { t } from '@lingui/macro'

type Props = {
  params: Promise<{ lang: string }>
}

export default async function Home({ params }: Props) {
  const session = await getServerSession(authOptions)

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
        {t`home_page_main_title`}
      </Typography>
      <Typography variant='subtitle1' gutterBottom>
        {t`home_page_subtitle`}
      </Typography>
      <Typography variant='body2' color='textSecondary' sx={{ mb: 4 }}>
        {t`home_page_description`}
      </Typography>
      {session?.user ? (
        <>
          <Box>You are logged in as {session?.user?.email}</Box>
          <LogoutButton />
        </>
      ) : (
        <>
          <Box>You are no logged in</Box>
          <LoginButton />
        </>
      )}
    </Container>
  )
}
