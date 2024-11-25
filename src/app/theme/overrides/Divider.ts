/* eslint-disable react/destructuring-assignment */

/**
 * @link https://mui.com/customization/theme-components/#default-props
 *
 * @link https://mui.com/components/dividers/
 * @link https://mui.com/api/divider/
 */

import { Theme } from '@mui/material/styles';

export default function Divider(theme: Theme) {
    return {
        MuiDivider: {
            defaultProps: { textAlign: "center" },
            styleOverrides: {
                root: {
                    color: theme.palette.outlineVariant,
                    borderColor:  theme.palette.outlineVariant,
                    fontSize: '2px',
                    "&::before": {
                        position: "inherit",
                    },
                    "&::after": {
                        position: "inherit",
                    },
                },
            },
        },
    }
}
