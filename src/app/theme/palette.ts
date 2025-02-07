type ColorPalette = Record<string, string>

// @ts-expect-error: Temporarily ignoring type inference for universityColors
import { universityColors } from '../../../configs'

// @ts-expect-error: Temporarily ignoring type inference for universityColors
const colors: ColorPalette = universityColors as unknown as ColorPalette

interface Theme {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
  primary: Record<string, string>
  secondary: Record<string, string>
  tertiary: Record<string, string>
  error: Record<string, string>
}

const light: Theme = {
  onPrimary: colors.secondary100,
  primaryContainer: colors.primary90,
  onPrimaryContainer: colors.primary10,
  primaryFixed: colors.primary90,
  primaryFixedDim: colors.primary80,
  onPrimaryFixed: colors.primary10,
  onPrimaryFixedVariant: colors.primary30,
  surfaceDim: colors.neutral87,
  surface: colors.neutral98,
  surfaceBright: colors.neutral98,
  surfaceContainerLowest: colors.neutral100,
  surfaceContainerLow: colors.neutral96,
  surfaceContainer: colors.neutral94,
  surfaceContainerHigh: colors.neutral92,
  surfaceContainerHighest: colors.neutral90,
  onSurface: colors.neutral10,
  onSurfaceVariant: colors.neutralVariant30,
  outline: colors.neutralVariant50,
  outlineVariant: colors.neutralVariant80,
  onSecondary: colors.secondary100,
  secondaryContainer: colors.secondary90,
  onSecondaryContainer: colors.secondary10,
  secondaryFixed: colors.secondary90,
  secondaryFixedDim: colors.secondary80,
  onSecondaryFixed: colors.secondary10,
  onSecondaryFixedVariant: colors.secondary30,
  onTertiary: colors.tertiary100,
  tertiaryContainer: colors.tertiary90,
  onTertiaryContainer: colors.tertiary10,
  tertiaryFixed: colors.tertiary90,
  tertiaryFixedDim: colors.tertiary80,
  onTertiaryFixed: colors.tertiary10,
  onTertiaryFixedVariant: colors.tertiary30,
  onError: colors.error100,
  errorContainer: colors.error90,
  onErrorContainer: colors.error10,
  inverseSurface: colors.neutral20,
  inverseOnSurface: colors.neutral95,
  inversePrimary: colors.primary80,
  scrim: colors.neutral0,
  shadows: colors.neutral0,
  white: colors.white,
  cardBorder: colors.cardBorder,
  primary: {
    main: colors.primary40,
    light: colors.primary40,
    dark: colors.primary70,
  },
  secondary: {
    main: colors.secondary50,
    light: colors.secondary40,
    dark: colors.secondary70,
  },
  tertiary: {
    main: colors.tertiary50,
    light: colors.tertiary40,
    dark: colors.tertiary70,
  },
  error: {
    main: colors.error50,
    light: colors.error40,
    dark: colors.error70,
  },
}

const dark: Theme = {
  onPrimary: colors.secondary20,
  primaryContainer: colors.primary30,
  onPrimaryContainer: colors.primary90,
  primaryFixed: colors.primary90,
  primaryFixedDim: colors.primary80,
  onPrimaryFixed: colors.primary10,
  onPrimaryFixedVariant: colors.primary30,
  surfaceDim: colors.neutral6,
  surface: colors.neutral6,
  surfaceBright: colors.neutral24,
  surfaceContainerLowest: colors.neutral4,
  surfaceContainerLow: colors.neutral10,
  surfaceContainer: colors.neutral12,
  surfaceContainerHigh: colors.neutral17,
  surfaceContainerHighest: colors.neutral22,
  onSurface: colors.neutral90,
  onSurfaceVariant: colors.neutralVariant80,
  outline: colors.neutralVariant60,
  outlineVariant: colors.neutralVariant30,
  onSecondary: colors.secondary20,
  secondaryContainer: colors.secondary30,
  onSecondaryContainer: colors.secondary90,
  secondaryFixed: colors.secondary90,
  secondaryFixedDim: colors.secondary80,
  onSecondaryFixed: colors.secondary10,
  onSecondaryFixedVariant: colors.secondary30,
  onTertiary: colors.tertiary20,
  tertiaryContainer: colors.tertiary30,
  onTertiaryContainer: colors.tertiary90,
  tertiaryFixed: colors.tertiary90,
  tertiaryFixedDim: colors.tertiary80,
  onTertiaryFixed: colors.tertiary10,
  onTertiaryFixedVariant: colors.tertiary30,
  onError: colors.error80,
  errorContainer: colors.error30,
  onErrorContainer: colors.error90,
  inverseSurface: colors.neutral90,
  inverseOnSurface: colors.neutral20,
  inversePrimary: colors.primary40,
  scrim: colors.neutral0,
  shadows: colors.neutral0,
  white: colors.white,
  cardBorder: colors.cardBorder,
  primary: {
    main: colors.primary80,
    light: colors.primary40,
    dark: colors.primary80,
  },
  secondary: {
    main: colors.secondary50,
    light: colors.secondary40,
    dark: colors.secondary80,
  },
  tertiary: {
    main: colors.tertiary50,
    light: colors.tertiary40,
    dark: colors.tertiary80,
  },
  error: {
    main: colors.error50,
    light: colors.error40,
    dark: colors.error80,
  },
}

export { light, dark, colors }
