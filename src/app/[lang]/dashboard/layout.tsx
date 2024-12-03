'use client'

import { Appbar } from '@/components/appbar'
import { Sidebar } from '@/components/sidebar'
import { useTheme } from '@mui/material/styles'
import { Box, useMediaQuery } from '@mui/system'
import { useState } from 'react'
import { useSession } from 'next-auth/react'

export default function DashboardLayout({
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

  if (status === 'loading') {
    return <p>Loading...</p>
  }
  if (status !== 'authenticated') {
    return <p>Unauthenticated</p>
  }

  return (
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
          padding: !isMobile ? '24px' : '16px', // Add some padding on mobile
          marginLeft: !isMobile && open ? '240px' : !isMobile ? '72px' : 0, // Adjust for Sidebar width
          marginTop: isMobile ? '64px' : 0, // Adjust for AppBar height (typically 64px on mobile)
          overflowY: 'auto', // Allow scrolling if content overflows
          zIndex: 1, // Keep content below AppBar and Sidebar
          position: 'relative', // Ensure main is properly positioned
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
