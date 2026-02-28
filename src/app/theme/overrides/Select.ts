import { Theme } from '@mui/material/styles'

const Select = (theme: Theme) => ({
  MuiSelect: {
    defaultProps: {},
    styleOverrides: {
      root: {},
      icon: {
        color: theme.palette.text.secondary,
      },
    },
  },
})
export default Select
