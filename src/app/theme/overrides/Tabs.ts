import { Theme } from '@mui/material/styles'

export default function Tabs(theme: Theme) {
  return {
    MuiTabs: {
      defaultProps: {},
      styleOverrides: {
        root: {},
        indicator: {
          height: '4px',
          borderRadius: '100px 100px 0px 0px',
          backgroundColor: theme.palette.primary.main,
        },
      },
    },
  }
}
