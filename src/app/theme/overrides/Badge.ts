import { Theme } from '@mui/material/styles'

export default function Badge(theme: Theme) {
  return {
    MuiBadge: {
      defaultProps: {
        showZero: false,
        variant: 'standard',
      },
      styleOverrides: {
        root: {},
        badge: {},
      },
    },
  }
}
