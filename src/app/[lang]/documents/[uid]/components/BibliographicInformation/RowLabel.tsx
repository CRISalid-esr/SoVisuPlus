import { Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

export default function RowLabel({ children }: { children: React.ReactNode }) {
  const theme = useTheme()

  return (
    <Typography
      sx={{
        color: theme.palette.primary.main,
        fontSize: theme.utils.pxToRem(14),
        fontStyle: 'normal',
        fontWeight: theme.typography[500],
        lineHeight: 'normal',
        letterSpacing: '0.1px',
      }}
    >
      {children}
    </Typography>
  )
}
