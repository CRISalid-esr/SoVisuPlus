'use client';
import { createTheme } from '@mui/material/styles';

import { dark, light, colors } from './palatte'
import breakpoints from './breakpoints'
import typography from "./typography" // Custom and MUI default

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    ...light,
    ...colors
  },
  breakpoints,
  typography
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    ...dark,
    ...colors
  },
  breakpoints,
  typography
});

export { lightTheme, darkTheme };
