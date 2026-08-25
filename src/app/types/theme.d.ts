// theme.d.ts
import '@mui/material/styles'
import '@mui/material/Typography'
declare module '@mui/material/styles' {
  interface Theme {
    utils: {
      pxToLineHeight: (fontSize: number, lineHeight: number) => string
      pxToThemeSpacing: (value: number, scaling?: number) => number
      pxToRem: (value: number) => string
      responsiveFontSizes: (sizes: {
        sm: number
        md: number
        lg: number
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) => Record<string, any>
    }
    typography: {
      fontWeightLight: number
      fontWeightRegular: number
      fontWeightMedium: number
      fontWeightBold: number
      500: number
      bodyLarge?: React.CSSProperties // Allow customization for `bodyLarge`
      displayLarge: React.CSSProperties // Allow customization for `displayLarge`
      bodySmall?: React.CSSProperties // Allow customization for `bodySmall`
      headingSmall: React.CSSProperties // Allow customization for `headingSmall`
      lineHeight: {
        lineHeight64px: string // "4rem", 64px
        lineHeight52px: string // "3rem", 52px
        lineHeight44px: string // "2.75rem", 44px
        lineHeight40px: string // "2.5rem", 40px
        lineHeight36px: string // "2.25rem", 36px
        lineHeight32px: string // "2rem", 32px
        lineHeight28px: string // "1.75rem", 28px
        lineHeight24px: string // "1.5rem", 24px
        lineHeight20px: string // "1.25rem", 20px
        lineHeight18px: string // "1.125rem", 18px
        lineHeight16px: string // "1rem", 16px
        lineHeight14px: string // "0.875rem", 14px
        lineHeight12px: string // "0.75rem", 12px
        lineHeight10px: string // "0.625rem", 10px
      }
    }
  }

  interface ThemeOptions {
    utils?: {
      pxToLineHeight?: (fontSize: number, lineHeight: number) => string
      pxToThemeSpacing?: (value: number, scaling?: number) => number
      pxToRem?: (value: number) => string
      responsiveFontSizes?: (sizes: {
        sm: number
        md: number
        lg: number
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) => Record<string, any>
    }
    typography?: {
      bodyLarge?: React.CSSProperties
      bodySmall?: React.CSSProperties
      displayLarge?: React.CSSProperties
      headingSmall?: React.CSSProperties
      fontWeightLight?: number
      fontWeightRegular?: number
      fontWeightMedium?: number
      fontWeightBold?: number
      lineHeight?: {
        lineHeight64px?: string // "4rem", 64px
        lineHeight52px?: string // "3rem", 52px
        lineHeight44px?: string // "2.75rem", 44px
        lineHeight40px?: string // "2.5rem", 40px
        lineHeight36px?: string // "2.25rem", 36px
        lineHeight32px?: string // "2rem", 32px
        lineHeight28px?: string // "1.75rem", 28px
        lineHeight24px?: string // "1.5rem", 24px
        lineHeight20px?: string // "1.25rem", 20px
        lineHeight18px?: string // "1.125rem", 18px
        lineHeight16px?: string // "1rem", 16px
        lineHeight14px?: string // "0.875rem", 14px
        lineHeight12px?: string // "0.75rem", 12px
        lineHeight10px?: string // "0.625rem", 10px
      }
    }
  }

  interface Palette {
    onPrimary: string
    primaryContainer: string
    onPrimaryContainer: string
    primaryFixed: string
    primaryFixedDim: string
    onPrimaryFixed: string
    onPrimaryFixedVariant: string
    surfaceDim: string
    surface: string
    surfaceBright: string
    surfaceContainerLowest: string
    surfaceContainerLow: string
    surfaceContainer: string
    surfaceContainerHigh: string
    surfaceContainerHighest: string
    onSurface: string
    onSurfaceVariant: string
    outline: string
    outlineVariant: string
    onSecondary: string
    secondaryContainer: string
    onSecondaryContainer: string
    lightSecondaryContainer: string
    secondaryFixed: string
    secondaryFixedDim: string
    onSecondaryFixed: string
    onSecondaryFixedVariant: string
    onTertiary: string
    tertiaryContainer: string
    onTertiaryContainer: string
    tertiaryFixed: string
    tertiaryFixedDim: string
    onTertiaryFixed: string
    onTertiaryFixedVariant: string
    onError: string
    errorContainer: string
    onErrorContainer: string
    inverseSurface: string
    inverseOnSurface: string
    inversePrimary: string
    scrim: string
    shadows: string
    white: string
    gray950: string
    sidebarItemHover: string
    cardBorder: string
    textSecondary: string
    /** Light-orange "needs attention" tints, derived from `warning.main`. */
    warningSurface: string
    warningSurfaceStrong: string
    warningOutline: string
    /** Amber-yellow flagging deprecated / "OLD" reference data. */
    warningYellow: string
  }

  interface PaletteOptions {
    onPrimary?: string
    primaryContainer?: string
    onPrimaryContainer?: string
    primaryFixed?: string
    primaryFixedDim?: string
    onPrimaryFixed?: string
    onPrimaryFixedVariant?: string
    surfaceDim?: string
    surface?: string
    surfaceBright?: string
    surfaceContainerLowest?: string
    surfaceContainerLow?: string
    surfaceContainer?: string
    surfaceContainerHigh?: string
    surfaceContainerHighest?: string
    onSurface?: string
    onSurfaceVariant?: string
    outline?: string
    outlineVariant?: string
    onSecondary?: string
    secondaryContainer?: string
    onSecondaryContainer?: string
    lightSecondaryContainer?: string
    secondaryFixed?: string
    secondaryFixedDim?: string
    onSecondaryFixed?: string
    onSecondaryFixedVariant?: string
    onTertiary?: string
    tertiaryContainer?: string
    onTertiaryContainer?: string
    tertiaryFixed?: string
    tertiaryFixedDim?: string
    onTertiaryFixed?: string
    onTertiaryFixedVariant?: string
    onError?: string
    errorContainer?: string
    onErrorContainer?: string
    inverseSurface?: string
    inverseOnSurface?: string
    inversePrimary?: string
    scrim?: string
    shadows?: string
    gray950?: string
    sidebarItemHover?: string
    cardBorder?: string
    textSecondary?: string
    warningSurface?: string
    warningSurfaceStrong?: string
    warningOutline?: string
    warningYellow?: string
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    bodyLarge: true // Enable `bodyLarge` as a valid variant
    bodySmall: true
    displayLarge: true // Enable `displayLarge` as a valid variant
    headingSmall: true
  }
}
