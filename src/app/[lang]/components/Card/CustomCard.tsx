import { Box, Card } from '@mui/material'
import React, { ReactNode } from 'react'
import { useTheme } from '@mui/material/styles'

interface CustomCardProps {
  header?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

const CustomCard: React.FC<CustomCardProps> = ({
  header,
  children,
  footer,
}) => {
  const theme = useTheme()
  return (
    <Card
      sx={{ borderRadius: 1, boxShadow: 1, padding: theme.spacing(2) }}
    >
      {header && <Box>{header}</Box>}
      {children}
      {footer && <Box>{footer}</Box>}
    </Card>
  )
}

export default CustomCard
