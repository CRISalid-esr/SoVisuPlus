import AppBar from '@mui/material/AppBar'
import IconButton from '@mui/material/IconButton'
import Toolbar from '@mui/material/Toolbar'
import { Box } from '@mui/system'
import Image from 'next/image'
import { Menu02 as Menu } from '@untitled-ui/icons-react'
import { ThemeMode, useThemeContext } from '../../context/ThemeContext'
import { universityLogos } from '../../../../../configs'

export default function Appbar({
  handleToggleDrawer,
}: {
  handleToggleDrawer: () => void
}) {
  const toggleDrawer = () => handleToggleDrawer()
  const { currentTheme } = useThemeContext()

  const renderUnversityLogo = () => {
    if (currentTheme === ThemeMode.light) {
      return universityLogos.lightSideBarLogo
    }
    return universityLogos.darkSideBarLogo
  }
  return (
    <AppBar
      sx={(theme) => ({
        flexGrow: 1,
        height: theme.utils.pxToRem(64),
      })}
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
              src={renderUnversityLogo()}
              alt='Crisalid logo'
              width={0}
              height={0}
              sizes='100vw'
              style={{ width: '120px', height: 'auto' }} // optional
              priority
            />
          </Box>
          <IconButton
            edge='start'
            color='inherit'
            aria-label='menu'
            onClick={toggleDrawer}
          >
            <Menu />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  )
}
