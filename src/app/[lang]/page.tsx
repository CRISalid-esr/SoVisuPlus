// page.tsx (Server Component)
import { Box } from '@mui/material'
import { getServerSession } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import Splash from './splash'
import { redirect } from 'next/navigation'

export default async function Home() {
  const session = (await getServerSession(authOptions)) as {
    user: { email: string }
  } | null
  // if session.user, redirect to /dashboard
  if (session?.user) {
    redirect(`/dashboard`)
  } else {
    return (
      <Box display='flex' flexDirection='row' height='100vh' width='100vw'>
        <Splash session={session} />
      </Box>
    )
  }
}
