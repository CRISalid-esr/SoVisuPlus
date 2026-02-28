import spacing from "./spacing"; // Default scaling factor, typically 8 in MUI
import { pxToRem as typographyPxToRem } from "./typography";

/**
 * Converts fontSize and lineHeight to a scale factor.
 * A scale factor between 1.2 (120%) and 1.5 (150%) is recommended.
 *
 * @param fontSize - The font size in pixels
 * @param lineHeight - The line height in pixels
 * @returns The scale factor as a string rounded to 2 decimal places
 */
export const pxToLineHeight = (fontSize: number, lineHeight: number): string => {
  if (!Number.isInteger(fontSize)) {
    throw new Error(`pxToLineHeight(${fontSize}, y) fontSize is not an Integer.`);
  }
  if (!Number.isInteger(lineHeight)) {
    throw new Error(`pxToLineHeight(x, ${lineHeight}) lineHeight is not an Integer.`);
  }
  return (lineHeight / fontSize).toFixed(2);
};

/**
 * Converts a pixel value to a theme spacing factor based on a scaling value.
 *
 * @param value - The pixel value to convert
 * @param scaling - The spacing scaling factor, defaulting to the imported value
 * @returns The theme spacing factor
 */
export const pxToThemeSpacing = (value: number, scaling: number = spacing): number => {
  if (!Number.isInteger(value)) {
    throw new Error(`pxToThemeSpacing(${value}) value is not a whole number.`);
  }
  return value / scaling;
};

/**
 * Converts a pixel value to rem units using the theme typography converter.
 *
 * @param value - The pixel value to convert
 * @returns The equivalent rem value as a string
 */
export const pxToRem = (value: number): string => {
  if (!Number.isInteger(value)) {
    throw new Error(`pxToRem(${value}) value is not a whole number.`);
  }
  return typographyPxToRem(value);
};

/**
 * Generates responsive font sizes for different breakpoints.
 *
 * @param sizes - An object containing `sm`, `md`, and `lg` sizes in pixels
 * @returns A responsive font size object for MUI
 */
export const responsiveFontSizes = (sizes: {
  sm: number;
  md: number;
  lg: number;
}): Record<string, Record<string, string>> => {
  return {
    "@media (min-width:600px)": {
      fontSize: pxToRem(sizes.sm),
    },
    "@media (min-width:900px)": {
      fontSize: pxToRem(sizes.md),
    },
    "@media (min-width:1200px)": {
      fontSize: pxToRem(sizes.lg),
    },
  };
};

/**
 * A utility object aggregating common typography utilities.
 */
const utils = { pxToLineHeight, pxToThemeSpacing, pxToRem, responsiveFontSizes };

export default utils;
