import MenuIcon from '@mui/icons-material/Menu'
import AppBar from '@mui/material/AppBar'
import IconButton from '@mui/material/IconButton'
import Toolbar from '@mui/material/Toolbar'
import { Box } from '@mui/system'
import Image from 'next/image'

export default function Appbar({
  handleToggleDrawer,
}: {
  handleToggleDrawer: () => void
}) {
  const toggleDrawer = () => handleToggleDrawer()
  return (
    <AppBar
      sx={{
        flexGrow: 1,
        height: '64px',
      }}
      position='static'
    >
      <Toolbar>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Image
              src='/logo.svg'
              alt='Crisalid logo'
              width={32}
              height={32}
              priority
            />
            <Image
              src='/soVisuPlus.svg'
              alt='Crisalid logo'
              width={123.966}
              height={24.795}
              priority
            />
          </Box>
          <IconButton
            edge='start'
            color='inherit'
            aria-label='menu'
            onClick={toggleDrawer}
          >
            <MenuIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  )
}
