'use client'

import { Appbar } from '@/components/appbar'
import { Sidebar } from '@/components/sidebar'
import { useTheme } from '@mui/material/styles'
import { Box, useMediaQuery } from '@mui/system'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import AuthenticatedRoute from '@/components/AuthenticatedRoute'
import useStore from '@/stores/global_store'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true) // Determines if the drawer is expanded or collapsed

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const handleToggleDrawer = () => {
    setOpen((prev) => !prev)
  }

  const { data: session, status } = useSession()
  const fetchConnectedUser = useStore((state) => state.fetchConnectedUser)
  const connectedUser = useStore((state) => state.connectedUser)
  // Fetch connected user on session change
  useEffect(() => {
    if (status === 'authenticated' && session?.user && !connectedUser) {
      fetchConnectedUser()
    }
  }, [status, session])

  // Show a loading state if user data is still being fetched
  if (status === 'loading' && !connectedUser) {
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
          user={session?.user}
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
