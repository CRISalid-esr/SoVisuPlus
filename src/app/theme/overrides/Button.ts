import { Theme } from '@mui/material/styles'

export default function Button(theme: Theme) {
  return {
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: "'Roboto', sans-serif",
          textTransform: 'none',
          borderRadius: '100px',
          fontWeight: 500,
          fontSize: '0.875rem',
          padding: '8px 21px',
          gap: '8px',
          '&:disabled': {
            backgroundColor: '#1D1B201F',
            borderColor: 'transparent',
            color: 'rgba(29, 27, 32, 0.38)',
            boxShadow: 'none',
          },
          '& .MuiButton-startIcon': {
            marginRight: theme.spacing(0),
          },
        },
        filled: {
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.common.white,
          borderRadius: '100px',
          '&:hover': {
            boxShadow: '0px 1px 3px 1px #00000026',
            backgroundColor: theme.palette.primary.main,
          },
          '&:active': {
            boxShadow: '0px 1px 3px 1px #00000026',
          },
        },
        elevated: {
          backgroundColor: theme.palette.surfaceContainerLow,
          color: theme.palette.primary.main,
          boxShadow:
            '0px 1px 2px 0px rgba(0, 0, 0, 0.30), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
          '&:hover': {
            backgroundColor: '#EFF5F3',
            boxShadow: '0px 2px 6px 2px #00000026',
          },
          '&:focus': {
            backgroundColor: '#EFF5F3',
          },
          '&:active': {
            backgroundColor: '#EFF5F3',
          },
        },
        outlined: {
          color: theme.palette.primary.main,
          border: '1px solid',
          borderColor: '#6F7977',
          '&:hover': {
            backgroundColor: '#6750A414',
          },
          '&:focus': {
            borderColor: theme.palette.primary.main,
            backgroundColor: '#6750A41F',
          },
          '&:active': {
            backgroundColor: '#6750A41F',
          },
        },
        text: {
          color: theme.palette.primary.main,
          '&:hover': {
            backgroundColor: '#6750A414',
          },
          '&:focus': {
            backgroundColor: '#6750A41F',
          },
          '&:active': {
            backgroundColor: '#6750A41F',
          },
        },
        tonal: {
          backgroundColor: '#CCE8E3',
          borderColor: '#CCE8E3',
          color: '#05201C',
          '&:hover': {
            backgroundColor: '#CCE8E3',
          },
          '&:active': {
            backgroundColor: theme.palette.secondary.dark,
            boxShadow: 'none',
          },
        },
      },
    },
  }
}
