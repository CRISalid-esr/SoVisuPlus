import { FC, ReactNode } from 'react'
import { Typography } from '@mui/material'
import { Box } from '@mui/system'

interface DocumentHeaderProps {
  perspective: string
  pageName: string
  children?: ReactNode
}

const DocumentHeader: FC<DocumentHeaderProps> = ({
  perspective,
  pageName,
  children,
}) => {
  return (
    <Box
      mb={3}
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Typography variant='h4' gutterBottom>
        {pageName} : {perspective}
      </Typography>
      {children}
    </Box>
  )
}

export default DocumentHeader
