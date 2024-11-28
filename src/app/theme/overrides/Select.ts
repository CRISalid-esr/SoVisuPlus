 

import { Theme } from "@mui/material/styles";

export default function Select(theme: Theme) {
  return {
    MuiSelect: {
      defaultProps: {
      },
      styleOverrides: {
        root: {
        },
        icon: {
          color: theme.palette.text.secondary,
        },
      },
    },
  };
}
