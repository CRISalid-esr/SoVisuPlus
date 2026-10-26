import { createTheme } from '@mui/material'
import {
  contentCenteredSnackbarSx,
  MAIN_CONTENT_OFFSET_VAR,
} from './contentCenteredSnackbarSx'

describe('contentCenteredSnackbarSx', () => {
  it('shifts the snackbar centre by half the sidebar width from sm up', () => {
    const theme = createTheme()
    const sx = (contentCenteredSnackbarSx as (t: typeof theme) => object)(theme)

    expect(sx).toEqual({
      [theme.breakpoints.up('sm')]: {
        left: `calc(50% + var(${MAIN_CONTENT_OFFSET_VAR}, 0px) / 2)`,
      },
    })
  })
})
