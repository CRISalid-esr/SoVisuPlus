'use client'

import { Trans } from '@lingui/macro'
import {
  Drawer,
  FormControl,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent
} from '@mui/material'
import Avatar from '@mui/material/Avatar'
import { useTheme } from '@mui/material/styles'
import { Box, useMediaQuery } from '@mui/system'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  BarChartSquare,
  CheckDone,
  LayerThere,
  LifeBuoy,
  Settings,
  Users
} from '../../../theme/icons'



export default function Sidebar() {
  const [open, setOpen] = useState(true) // Determines if the drawer is expanded or collapsed
  const pathname = usePathname() // Get the current path
  const lang = pathname.split('/')[1] // Extract the `lang` dynamic segment
  const handleToggleDrawer = () => {
    setOpen((prev) => !prev)
  }
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const router = useRouter()

  const handleChange = (event: SelectChangeEvent) => {
    const pathWithoutLang = pathname.split('/').slice(2).join('/') // Remove the current lang segment
    router.push(`/${event.target.value}/${pathWithoutLang}`)
  }



  return (
    <>
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={open}
        sx={{
          '& .MuiDrawer-paper': {
            width: open ? (isMobile ? '80%' : 280) : 60, // Drawer width depending on whether it's open or collapsed
            transition: 'width 0.3s ease',
            boxSizing: 'border-box',
            backgroundColor: theme.palette.primary.main,
          },
        }}
        ModalProps={{
          keepMounted: true, // Improve performance on mobile
        }}
      >
        <Box
          sx={{
            marginTop: '32px',
            marginLeft: open ? '20px' : '0px',
            marginRight: open ? '20px' : '0px',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
            }}
          >
            {open ? (
              <>
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
                {!isMobile && (
                  <IconButton
                    onClick={handleToggleDrawer}
                    sx={{
                      marginLeft: 'auto',
                      zIndex: 1201, // to ensure the button appears above the drawer
                    }}
                  >
                    <Avatar
                      src='/hideSidePanel.svg' // Replace with your image path
                      alt='sidepanel'
                      sx={{ width: 24, height: 24 }}
                    />
                  </IconButton>
                )}
              </>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  flexDirection: 'column',
                  margin: '0 auto',
                }}
              >
                {
                  <IconButton
                    onClick={handleToggleDrawer}
                    sx={{
                      zIndex: 1201,
                    }}
                  >
                    <Avatar
                      src='/showSidePanel.svg'
                      alt='sidepanel'
                      sx={{ width: 24, height: 24 }}
                    />
                  </IconButton>
                }
                <Image
                  src='/logo.svg'
                  alt='Crisalid logo'
                  width={32}
                  height={32}
                  priority
                />
              </Box>
            )}
          </Box>
          <Box>
            <List>
              <ListItem component={Link} href={`/${lang}/dashboard`}>
                <ListItemIcon
                  sx={{
                    height: 24,
                    width: 24,
                    minWidth: 'unset',
                    marginRight: '12px',
                  }}
                >
                  <BarChartSquare color={theme.palette.onPrimaryContainer} />
                </ListItemIcon>
                {open && (
                  <ListItemText
                    sx={{
                      fontSize: '24px',
                      color: theme.palette.onPrimaryContainer,
                    }}
                    primary={<Trans>side_bar_dashboard</Trans>}
                  />
                )}
              </ListItem>
              <ListItem
                component={Link}
                href={`/${lang}/dashboard/publications`}
              >
                <ListItemIcon
                  sx={{
                    height: 24,
                    width: 24,
                    minWidth: 'unset',
                    marginRight: '12px',
                  }}
                >
                  <LayerThere color={theme.palette.onPrimaryContainer} />
                </ListItemIcon>
                {open && (
                  <ListItemText
                    sx={{
                      fontSize: '24px',
                      color: theme.palette.onPrimaryContainer,
                    }}
                    primary={<Trans>side_bar_publications</Trans>}
                  />
                )}
              </ListItem>
              <ListItem component={Link} href={`/${lang}/dashboard/expertise`}>
                <ListItemIcon
                  sx={{
                    height: 24,
                    width: 24,
                    minWidth: 'unset',
                    marginRight: '12px',
                  }}
                >
                  <CheckDone color={theme.palette.onPrimaryContainer} />
                </ListItemIcon>
                {open && (
                  <ListItemText
                    sx={{
                      fontSize: '24px',
                      color: theme.palette.onPrimaryContainer,
                    }}
                    primary={<Trans>side_bar_expertise</Trans>}
                  />
                )}
              </ListItem>
            </List>
          </Box>
          <Box>
            <ListItem component={Link} href={`/${lang}/dashboard/my-groups`}>
              <ListItemIcon
                sx={{
                  height: 24,
                  width: 24,
                  minWidth: 'unset',
                  marginRight: '12px',
                }}
              >
                <Users color={theme.palette.onPrimaryContainer} />
              </ListItemIcon>
              {open && (
                <ListItemText
                  sx={{
                    fontSize: '24px',
                    color: theme.palette.onPrimaryContainer,
                  }}
                  primary={<Trans>side_bar_my_groups</Trans>}
                />
              )}
            </ListItem>
            <ListItem component={Link} href={`/${lang}/dashboard/institutions`}>
              <ListItemIcon
                sx={{
                  height: 24,
                  width: 24,
                  minWidth: 'unset',
                  marginRight: '12px',
                }}
              >
                <LifeBuoy color={theme.palette.onPrimaryContainer} />
              </ListItemIcon>
              {open && (
                <ListItemText
                  sx={{
                    fontSize: '24px',
                    color: theme.palette.onPrimaryContainer,
                  }}
                  primary={<Trans>side_bar_institutions</Trans>}
                />
              )}
            </ListItem>
            <ListItem component={Link} href={`/${lang}/dashboard/laboratories`}>
              <ListItemIcon
                sx={{
                  height: 24,
                  width: 24,
                  minWidth: 'unset',
                  marginRight: '12px',
                }}
              >
                <Settings color={theme.palette.onPrimaryContainer} />
              </ListItemIcon>
              {open && (
                <ListItemText
                  sx={{
                    fontSize: '24px',
                    color: theme.palette.onPrimaryContainer,
                  }}
                  primary={<Trans>side_bar_laboratories</Trans>}
                />
              )}
            </ListItem>
          </Box>
          <Box sx={{ minWidth: 200 }}>
            <FormControl variant='filled' fullWidth>
              <Select
                displayEmpty
                value={lang}
                label='Options'
                onChange={handleChange}
              >
                <MenuItem id='en' value='en'>
                  English
                </MenuItem>
                <MenuItem id='fr' value='fr'>
                  Français
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Drawer>
    </>
  )
}
