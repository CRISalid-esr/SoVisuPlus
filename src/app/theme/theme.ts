'use client'
import { createTheme, alpha, PaletteOptions } from '@mui/material/styles'
import { yellow as muiYellow } from '@mui/material/colors'
import componentsOverride from './overrides'
import { dark, light, colors } from './palette'
import breakpoints from './breakpoints'
import typography from './typography' // Custom and MUI default
import {
  pxToLineHeight,
  pxToRem,
  pxToThemeSpacing,
  responsiveFontSizes,
} from './utils'

const utils = { pxToLineHeight, pxToRem, pxToThemeSpacing, responsiveFontSizes }

// Light-orange ("needs attention") tints, derived from warning.main so they
// track the warning colour. Centralises the alpha values used across the app.
const warningTints = (warningMain: string) => ({
  warningSurface: alpha(warningMain, 0.08),
  warningSurfaceStrong: alpha(warningMain, 0.15),
  warningOutline: alpha(warningMain, 0.4),
})

// Amber-yellow used to flag deprecated / "OLD" reference data (e.g. HAL
// structure results no longer valid). Legible on both light and dark surfaces.
const warningYellow = muiYellow[800]

// Resolve `warning.main` (MUI fills the defaults) so the tints can derive from it.
const resolvedWarningMain = (palette: PaletteOptions): string =>
  createTheme({ palette }).palette.warning.main

const lightPalette: PaletteOptions = { mode: 'light', ...light, ...colors }
const darkPalette: PaletteOptions = { mode: 'dark', ...dark, ...colors }

const lightTheme = createTheme({
  palette: {
    ...lightPalette,
    ...warningTints(resolvedWarningMain(lightPalette)),
    warningYellow,
  },
  breakpoints,
  typography,
  utils,
})

const darkTheme = createTheme({
  palette: {
    ...darkPalette,
    ...warningTints(resolvedWarningMain(darkPalette)),
    warningYellow,
  },
  breakpoints,
  typography,
  utils,
})

darkTheme.components = componentsOverride(darkTheme)
lightTheme.components = componentsOverride(lightTheme)

export { lightTheme, darkTheme }
