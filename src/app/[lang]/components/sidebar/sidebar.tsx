'use client'

import { Trans } from '@lingui/macro'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import HomeIcon from '@mui/icons-material/Home'
import MenuIcon from '@mui/icons-material/Menu'
import {
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import { Box } from '@mui/system'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function Sidebar() {
  const [open, setOpen] = useState(true) // Determines if the drawer is expanded or collapsed
  const pathname = usePathname() // Get the current path
  const lang = pathname.split('/')[1] // Extract the `lang` dynamic segment
  const handleToggleDrawer = () => {
    setOpen((prev) => !prev)
  }

  return (
    <>
      <IconButton
        onClick={handleToggleDrawer}
        sx={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 1201, // to ensure the button appears above the drawer
        }}
      >
        <MenuIcon />
      </IconButton>
      <Drawer
        variant='permanent'
        open={open}
        sx={{
          '& .MuiDrawer-paper': {
            width: open ? 240 : 60, // Drawer width depending on whether it's open or collapsed
            transition: 'width 0.3s ease',
            boxSizing: 'border-box',
          },
        }}
      >
        <Box>
          <List>
            <ListItem component={Link} href={`/${lang}/dashboard`}>
              <ListItemIcon>
                <HomeIcon />
              </ListItemIcon>
              {open && (
                <ListItemText primary={<Trans>side_bar_dashboard</Trans>} />
              )}
            </ListItem>
            <ListItem component={Link} href={`/${lang}/dashboard/publications`}>
              <ListItemIcon>
                <AccountCircleIcon />
              </ListItemIcon>
              {open && (
                <ListItemText primary={<Trans>side_bar_publications</Trans>} />
              )}
            </ListItem>
            <ListItem component={Link} href={`/${lang}/dashboard/expertise`}>
              <ListItemIcon>
                <AccountCircleIcon />
              </ListItemIcon>
              {open && (
                <ListItemText primary={<Trans>side_bar_expertise</Trans>} />
              )}
            </ListItem>
            <ListItem
              component={Link}
              href={`/${lang}/dashboard/research-activities`}
            >
              <ListItemIcon>
                <AccountCircleIcon />
              </ListItemIcon>
              {open && (
                <ListItemText
                  primary={<Trans>side_bar_research_activities</Trans>}
                />
              )}
            </ListItem>
          </List>
        </Box>
        <Box>
          <ListItem component={Link} href={`/${lang}/dashboard/my-groups`}>
            <ListItemIcon>
              <AccountCircleIcon />
            </ListItemIcon>
            {open && (
              <ListItemText primary={<Trans>side_bar_my-groups</Trans>} />
            )}
          </ListItem>
          <ListItem component={Link} href={`/${lang}/dashboard/my-groups`}>
            <ListItemIcon>
              <AccountCircleIcon />
            </ListItemIcon>
            {open && (
              <ListItemText primary={<Trans>side_bar_my_groups</Trans>} />
            )}
          </ListItem>
          <ListItem component={Link} href={`/${lang}/dashboard/institutions`}>
            <ListItemIcon>
              <AccountCircleIcon />
            </ListItemIcon>
            {open && (
              <ListItemText primary={<Trans>side_bar_institutions</Trans>} />
            )}
          </ListItem>
          <ListItem component={Link} href={`/${lang}/dashboard/laboratories`}>
            <ListItemIcon>
              <AccountCircleIcon />
            </ListItemIcon>
            {open && (
              <ListItemText primary={<Trans>side_bar_laboratories</Trans>} />
            )}
          </ListItem>
        </Box>
      </Drawer>
    </>
  )
}
