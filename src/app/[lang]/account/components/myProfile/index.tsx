import Identifiers from '@/app/[lang]/account/components/myProfile/components/Identifiers'
import Affiliations from '@/app/[lang]/account/components/myProfile/components/Affiliations'
import { Box } from '@mui/material'

const MyProfilePage = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <Identifiers />
    <Affiliations />
  </Box>
)
export default MyProfilePage
