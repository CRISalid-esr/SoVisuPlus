import React from 'react'
import { Box, CircularProgress } from '@mui/material'

const Loading = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh', // Ensures the spinner is centered vertically in the viewport
        backgroundColor: 'background.default', // Optional: matches the theme background color
      }}
    >
      <CircularProgress />
    </Box>
  )
}

export default Loading
