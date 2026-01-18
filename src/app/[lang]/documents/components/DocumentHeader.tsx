import { FC, ReactNode } from 'react'
import { Typography } from '@mui/material'
import { Box } from '@mui/system'

interface DocumentHeaderProps {
  perspectiveName: string
  pageName: string
  children?: ReactNode
}

const DocumentHeader: FC<DocumentHeaderProps> = ({
  perspectiveName,
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
        {pageName} : {perspectiveName}
      </Typography>
      {children}
    </Box>
  )
}

export default DocumentHeader
