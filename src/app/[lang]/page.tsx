// page.tsx (Server Component)
import { Box } from '@mui/material'
import Splash from './splash'
import UnauthenticatedRoute from '@/components/UnauthenticatedRoute'
import { getSplashImages } from '@/utils/getSplashImages'

export default async function Home() {
  const splashImages = getSplashImages()
  return (
    <UnauthenticatedRoute>
      <Box display='flex' flexDirection='row' height='100vh' width='100vw'>
        <Splash images={splashImages} />
      </Box>
    </UnauthenticatedRoute>
  )
}
