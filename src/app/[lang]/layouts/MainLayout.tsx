'use client'

import { Appbar } from '@/components/appbar'
import { Sidebar } from '@/components/sidebar'
import { useTheme } from '@mui/material/styles'
import { Box, useMediaQuery } from '@mui/system'
import { useEffect, useState } from 'react'
import AuthenticatedRoute from '@/components/AuthenticatedRoute'
import useStore from '@/stores/global_store'
import { IAgent } from '@/types/IAgent'
import { useSearchParams } from 'next/navigation'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true) // Determines if the drawer is expanded or collapsed

  const { currentPerspective, setPerspective, setPerspectiveBySlug } = useStore(
    (state) => state.user,
  )
  const searchParams = useSearchParams()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const handleToggleDrawer = () => {
    setOpen((prev) => !prev)
  }

  const { connectedUser, loading, fetchConnectedUser } = useStore(
    (state) => state.user,
  )

  useEffect(() => {
    if (!connectedUser) {
      fetchConnectedUser().catch((error) => {
        console.error('Failed to fetch connected user', error)
      })
    }
  }, [connectedUser, fetchConnectedUser])

  // if the current perspective is not set, set it to the connected user
  useEffect(() => {
    const perspectiveSlugFromUrl = searchParams?.get('perspective')
    // If the perspective is set from the url, and there is no current
    // perspective, or if current perspective does not match the slug
    // provided through the url, force the current perspective
    if (
      perspectiveSlugFromUrl &&
      (!currentPerspective || currentPerspective.slug != perspectiveSlugFromUrl)
    ) {
      setPerspectiveBySlug(perspectiveSlugFromUrl)
    } else if (connectedUser && !currentPerspective) {
      // If there is no current perspective, the connected user
      // will watch her/his own works
      setPerspective(connectedUser.person as IAgent)
    }
  }, [connectedUser, currentPerspective, setPerspective, searchParams])

  if (loading && !connectedUser) {
    return <p>Loading...</p>
  }

  return (
    <AuthenticatedRoute>
      <Box sx={{ display: 'flex', height: '100vh' }}>
        {/* AppBar for mobile */}
        {isMobile && <Appbar handleToggleDrawer={handleToggleDrawer} />}
        {/* Sidebar */}
        <Sidebar
          handleToggleDrawerAction={handleToggleDrawer}
          open={open}
          user={connectedUser}
        />
        {/* Main Content */}
        <Box
          component='main'
          sx={{
            flexGrow: 1,
            padding: !isMobile ? '32px' : '24px 16px', // Add some padding on mobile
            marginLeft: !isMobile && open ? '280px' : !isMobile ? '72px' : 0, // Adjust for Sidebar width
            marginTop: isMobile ? '64px' : 0, // Adjust for AppBar height (typically 64px on mobile)
            overflowY: 'auto', // Allow scrolling if content overflows
            position: 'relative', // Ensure main is properly positioned
          }}
        >
          {children}
        </Box>
      </Box>
    </AuthenticatedRoute>
  )
}
