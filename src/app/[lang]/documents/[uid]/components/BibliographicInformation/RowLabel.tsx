import { Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

export default function RowLabel({
  isPrimary,
  children,
}: {
  isPrimary?: boolean
  children: React.ReactNode
}) {
  const theme = useTheme()

  return (
    <Typography
      sx={{
        color: theme.palette.primary.main,
        fontSize: theme.utils.pxToRem(14),
        fontStyle: 'normal',
        fontWeight: isPrimary
          ? theme.typography.fontWeightMedium
          : theme.typography[500],
        lineHeight: 'normal',
        letterSpacing: '0.1px',
      }}
    >
      {children}
    </Typography>
  )
}
