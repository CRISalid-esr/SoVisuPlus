'use client'
import { createTheme, alpha } from '@mui/material/styles'
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

const baseLight = createTheme({
  palette: { mode: 'light', ...light, ...colors },
  breakpoints,
  typography,
  utils,
})
const lightTheme = createTheme(baseLight, {
  palette: warningTints(baseLight.palette.warning.main),
})

const baseDark = createTheme({
  palette: { mode: 'dark', ...dark, ...colors },
  breakpoints,
  typography,
  utils,
})
const darkTheme = createTheme(baseDark, {
  palette: warningTints(baseDark.palette.warning.main),
})

darkTheme.components = componentsOverride(darkTheme)
lightTheme.components = componentsOverride(lightTheme)

export { lightTheme, darkTheme }
