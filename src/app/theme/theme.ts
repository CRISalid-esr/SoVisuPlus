'use client';
import { createTheme } from '@mui/material/styles';

import { dark, light, colors } from './palatte'
import breakpoints from './breakpoints'
import typography from "./typography" // Custom and MUI default
import {
  pxToLineHeight, pxToRem, pxToThemeSpacing, responsiveFontSizes
} from './utils'


const lightTheme = createTheme({
  palette: {
    mode: 'light',
    ...light,
    ...colors
  },
  breakpoints,
  typography,
  utils: { pxToLineHeight, pxToRem, pxToThemeSpacing, responsiveFontSizes },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    ...dark,
    ...colors
  },
  breakpoints,
  typography,
  utils: { pxToLineHeight, pxToRem, pxToThemeSpacing, responsiveFontSizes },
});

export { lightTheme, darkTheme };
