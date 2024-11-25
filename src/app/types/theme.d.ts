// theme.d.ts
import "@mui/material/styles";

declare module "@mui/material/styles" {
    interface Theme {
        utils: {
            pxToLineHeight: (fontSize: number, lineHeight: number) => string;
            pxToThemeSpacing: (value: number, scaling?: number) => number;
            pxToRem: (value: number) => string;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            responsiveFontSizes: (sizes: { sm: number; md: number; lg: number }) => Record<string, any>;
        };
    }
    interface ThemeOptions {
        utils?: {
            pxToLineHeight?: (fontSize: number, lineHeight: number) => string;
            pxToThemeSpacing?: (value: number, scaling?: number) => number;
            pxToRem?: (value: number) => string;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            responsiveFontSizes?: (sizes: { sm: number; md: number; lg: number }) => Record<string, any>;
        };
    }
    interface Palette {
        onPrimary: string;
        primaryContainer: string;
        onPrimaryContainer: string;
        primaryFixed: string;
        primaryFixedDim: string;
        onPrimaryFixed: string;
        onPrimaryFixedVariant: string;
        surfaceDim: string;
        surface: string;
        surfaceBright: string;
        surfaceContainerLowest: string;
        surfaceContainerLow: string;
        surfaceContainer: string;
        surfaceContainerHigh: string;
        surfaceContainerHighest: string;
        onSurface: string;
        onSurfaceVariant: string;
        outline: string;
        outlineVariant: string;
        onSecondary: string;
        secondaryContainer: string;
        onSecondaryContainer: string;
        secondaryFixed: string;
        secondaryFixedDim: string;
        onSecondaryFixed: string;
        onSecondaryFixedVariant: string;
        onTertiary: string;
        tertiaryContainer: string;
        onTertiaryContainer: string;
        tertiaryFixed: string;
        tertiaryFixedDim: string;
        onTertiaryFixed: string;
        onTertiaryFixedVariant: string;
        onError: string;
        errorContainer: string;
        onErrorContainer: string;
        inverseSurface: string;
        inverseOnSurface: string;
        inversePrimary: string;
        scrim: string;
        shadows: string;
        white: string;
    }

    interface PaletteOptions {
        onPrimary?: string;
        primaryContainer?: string;
        onPrimaryContainer?: string;
        primaryFixed?: string;
        primaryFixedDim?: string;
        onPrimaryFixed?: string;
        onPrimaryFixedVariant?: string;
        surfaceDim?: string;
        surface?: string;
        surfaceBright?: string;
        surfaceContainerLowest?: string;
        surfaceContainerLow?: string;
        surfaceContainer?: string;
        surfaceContainerHigh?: string;
        surfaceContainerHighest?: string;
        onSurface?: string;
        onSurfaceVariant?: string;
        outline?: string;
        outlineVariant?: string;
        onSecondary?: string;
        secondaryContainer?: string;
        onSecondaryContainer?: string;
        secondaryFixed?: string;
        secondaryFixedDim?: string;
        onSecondaryFixed?: string;
        onSecondaryFixedVariant?: string;
        onTertiary?: string;
        tertiaryContainer?: string;
        onTertiaryContainer?: string;
        tertiaryFixed?: string;
        tertiaryFixedDim?: string;
        onTertiaryFixed?: string;
        onTertiaryFixedVariant?: string;
        onError?: string;
        errorContainer?: string;
        onErrorContainer?: string;
        inverseSurface?: string;
        inverseOnSurface?: string;
        inversePrimary?: string;
        scrim?: string;
        shadows?: string;
    }
}
