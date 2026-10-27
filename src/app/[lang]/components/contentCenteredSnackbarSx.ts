import type { SxProps, Theme } from '@mui/material'

/**
 * CSS variable set by `MainLayout` to the width taken by the sidebar, so fixed
 * elements rendered inside the main content can align on it.
 */
export const MAIN_CONTENT_OFFSET_VAR = '--main-content-offset'

/**
 * Centres a horizontally centred MUI Snackbar on the main content area instead
 * of the whole viewport. Below `sm`, MUI already stretches it to full width.
 */
export const contentCenteredSnackbarSx: SxProps<Theme> = (theme) => ({
  [theme.breakpoints.up('sm')]: {
    left: `calc(50% + var(${MAIN_CONTENT_OFFSET_VAR}, 0px) / 2)`,
  },
})
