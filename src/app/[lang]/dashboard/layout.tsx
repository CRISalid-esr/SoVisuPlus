'use client'
import { Appbar } from '@/components/appbar'
import { Sidebar } from '@/components/sidebar'
import { useTheme } from '@mui/material/styles'
import { useMediaQuery } from '@mui/system'
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
    <div style={{ display: 'flex' }}>
     {isMobile && <Appbar handleToggleDrawer={handleToggleDrawer} />}
      <Sidebar handleToggleDrawer={handleToggleDrawer} open={open} />
      <main style={{ flexGrow: 1, padding: '16px' }}>{children}</main>
    </div>
  )
}
