'use client';
import { createTheme } from '@mui/material/styles';
import { dark, light, colors } from './palatte'
import breakpoints from './breakpoints'
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    ...light,
    ...colors
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    ...dark,
    ...colors
  },
  breakpoints
});

export { lightTheme, darkTheme };
