'use client'
import { Appbar } from '@/components/appbar'
import { Sidebar } from '@/components/sidebar'
import { useTheme } from '@mui/material/styles'
import { Box, useMediaQuery } from '@mui/system'
import { useState } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true) // Determines if the drawer is expanded or collapsed
  const handleToggleDrawer = () => {
    setOpen((prev) => !prev)
  }

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))


  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
    {isMobile && <Appbar handleToggleDrawer={handleToggleDrawer} />}
    {/* Sidebar will be conditionally rendered based on screen size */}
    <Sidebar handleToggleDrawer={handleToggleDrawer} open={open} />

    <Box
      component="main"
      sx={{
        padding:0,
        flexGrow: 1,
        marginTop: isMobile ? '56px' : 0, // Adjust main content padding to account for Appbar on mobile
        overflowY: 'auto', // Ensure content scrolls if necessary
      }}
    >
      {children}
    </Box>
  </Box>
  )
}
