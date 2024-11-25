 

import { Theme } from "@mui/material/styles";

export default function Select(theme: Theme) {
  return {
    MuiSelect: {
      defaultProps: {
      },
      styleOverrides: {
        root: {
          '&.MuiSelect-select': {
            '&:focus': {
              backgroundColor: "red",
                },
              color : "red",
          },
        },
        icon: {
          color: theme.palette.text.secondary,
        },
      },
    },
  };
}
