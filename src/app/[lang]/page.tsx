// page.tsx (Server Component)
import { Box } from '@mui/material'
import Splash from './splash'
import UnauthenticatedRoute from '@/components/UnauthenticatedRoute'

export default async function Home() {
  return (
    <UnauthenticatedRoute>
      <Box display='flex' flexDirection='row' height='100vh' width='100vw'>
        <Splash />
      </Box>
    </UnauthenticatedRoute>
  )
}
