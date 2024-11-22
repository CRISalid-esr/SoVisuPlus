const htmlFontSize = 16 // Browser default - do not change it
const baseFontSize = 14 // Real "base" fontSize - "0.875rem" - do not change it

const coef = baseFontSize / 14
export const pxToRem = (size:number) => `${(size / htmlFontSize) * coef}rem` // from MUI code


/**
 * The "letterSpacing" values can be found here:
 * @link https://github.com/mui-org/material-ui/blob/master/packages/mui-joy/src/styles/defaultTheme.ts
 * file: packages/mui-joy/src/styles/defaultTheme.ts
 */

const lineHeight = {
    lineHeight64px: pxToRem(64), // "4rem", 64px
    lineHeight52px: pxToRem(52), // "3rem", 52px
    lineHeight44px: pxToRem(44), // "2.75rem", 44px
    lineHeight40px: pxToRem(40), // "2.5rem", 40px
    lineHeight36px: pxToRem(36), // "2.25rem", 36px
    lineHeight32px: pxToRem(32), // "2rem", 32px
    lineHeight28px: pxToRem(28), // "1.75rem", 28px
    lineHeight24px: pxToRem(24), // "1.5rem", 24px
    lineHeight20px: pxToRem(20), // "1.25rem", 20px 
    lineHeight18px: pxToRem(18), // "1.125rem", 18px
    lineHeight16px: pxToRem(16), // "1rem", 16px
    lineHeight14px: pxToRem(14), // "0.875rem", 14px
    lineHeight12px: pxToRem(12), // "0.75rem", 12px
    lineHeight10px: pxToRem(10), // "0.625rem", 10px
    
}

const letterSpacing = {
    letterSpacing0: pxToRem(0), // "0rem", 0px
    "letterSpacing0.1": pxToRem(0.1), // "0.00625rem", 0.1px
    "letterSpacing0.4": pxToRem(0.4), // "0.025rem", 0.4px
    "letterSpacing0.5": pxToRem(0.5), // "0.03125rem", 0.5px
    "letterSpacing0.15": pxToRem(0.15), // "0.009375rem", 0.15px
    "letterSpacing0.10": pxToRem(0.10), // "0.00625rem", 0.10px
    "letterSpacing0.25": pxToRem(0.25), // "0.015625rem", 0.25px
}

/**
 * fontWeight from figma
 */
const fontWeight = {
    light: 300, // Use in MUI default
    normal: 400, // Use in MUI default - html normal standard 400
    medium: 500, // Use in MUI default
    bold: 700, // Use in MUI default - html bold standard 700
}

/**
 * fontSize from figma
 */
const fontSize = {
    rem96px: pxToRem(96), // "6rem", 96px
    rem60px: pxToRem(60), // "3.75rem", 60px
    rem57px: pxToRem(57), // "3.5625rem", 57px
    rem48px: pxToRem(48), // "3rem", 48px
    rem45px: pxToRem(45), // "2.8125rem", 45px
    rem44px: pxToRem(44), // "2.75rem", 44px
    rem36px: pxToRem(36), // "2.25rem", 36px
    rem34px: pxToRem(34), // "2.125rem", 34px
    rem32px: pxToRem(32), // "2rem", 32px
    rem28px: pxToRem(28), // "1.75rem", 28px
    rem24px: pxToRem(24), // "1.5rem", 24px
    rem22px: pxToRem(22), // "1.375rem", 22px
    rem20px: pxToRem(20), // "1.25rem", 20px
    rem16px: pxToRem(16), // "1rem", 16px
    rem14px: pxToRem(14), // "0.875rem", 14px
    rem12px: pxToRem(12), // "0.75rem", 12px
    rem11px : pxToRem(11), // "0.6875rem", 11px 
    rem10px: pxToRem(10), // "0.625rem", 10px
}

/**
 * Typography from figma
 */
export const figmaTypography = {
    fontFamily: '"Roboto", "Helvetica", "Arial", "sans-serif"',
    fontWeight,
    heading: {
        h1: {
            fontWeight: fontWeight.normal,
            fontSize: fontSize.rem96px,
        },
        h2: {
            fontWeight: fontWeight.normal,
            fontSize: fontSize.rem60px,
        },
        h3: {
            fontWeight: fontWeight.normal,
            fontSize: fontSize.rem48px,
        },
        h4: {
            fontWeight: fontWeight.normal,
            fontSize: fontSize.rem34px,
        },
        h5: {
            fontWeight: fontWeight.normal,
            fontSize: fontSize.rem24px,
        },
        h6: {
            fontWeight: fontWeight.normal,
            fontSize: fontSize.rem20px,
        },
    },
    body: {
        large: {
            fontWeight: fontWeight.normal,
            fontSize: fontSize.rem16px,
        },
        medium: {
            fontWeight: fontWeight.normal,
            fontSize:fontSize.rem14px
        },
        small: {
            fontWeight: fontWeight.normal,
            fontSize:fontWeight.normal
        }
    },
}

/**
 * Theme Custom Typography, use same name as Figma
 *
 * The "lineHeight" and "letterSpacing" function value can be found here:
 * @link https://github.com/mui-org/material-ui/blob/master/packages/mui-joy/src/styles/defaultTheme.ts
 * file: packages/mui-joy/src/styles/defaultTheme.ts
 */
const themeCustomTypography = {
    displayLarge: {
        fontSize: fontSize.rem57px,
        fontWeight: fontWeight.normal,
        lineHeight: lineHeight.lineHeight64px,
        letterSpacing: - Number(letterSpacing["letterSpacing0.25"])
    },
    displayMedium: {
        fontSize: fontSize.rem45px,
        fontWeight: fontWeight.normal,
        lineHeight: lineHeight.lineHeight52px,
        letterSpacing: letterSpacing.letterSpacing0
    },
    displaySmall: {
        fontSize: fontSize.rem36px,
        fontWeight: fontWeight.normal,
        lineHeight: lineHeight.lineHeight44px,
        letterSpacing: letterSpacing.letterSpacing0
    },
    headingLarge: {
        fontSize: fontSize.rem32px,
        fontWeight: fontWeight.normal,
        lineHeight: lineHeight.lineHeight40px,
        letterSpacing:letterSpacing.letterSpacing0
    },
    headingMedium: {
        fontSize: fontSize.rem28px,
        fontWeight: fontWeight.normal,
        lineHeight: lineHeight.lineHeight36px,
        letterSpacing:letterSpacing.letterSpacing0
    },
    headingSmall: {
        fontSize: fontSize.rem24px,
        fontWeight: fontWeight.normal,
        lineHeight: lineHeight.lineHeight32px,
        letterSpacing: letterSpacing.letterSpacing0,
    },
    titleLarge: {
        fontSize: fontSize.rem22px,
        fontWeight: fontWeight.normal,
        lineHeight: lineHeight.lineHeight28px,
        letterSpacing: letterSpacing.letterSpacing0,
    },
    titleMedium: {
        fontSize: fontSize.rem16px,
        fontWeight: fontWeight.normal,
        lineHeight: lineHeight.lineHeight24px,
        letterSpacing: letterSpacing["letterSpacing0.15"],
    },
    titleSmall: {
        fontSize: fontSize.rem14px,
        fontWeight: fontWeight.normal,
        lineHeight: lineHeight.lineHeight20px,
        letterSpacing: letterSpacing['letterSpacing0.1']   
    },
    LabelLarge: {
        fontSize: fontSize.rem14px,
        fontWeight: fontWeight.normal,
        lineHeight: lineHeight.lineHeight20px,
        letterSpacing:letterSpacing["letterSpacing0.1"]
    },
    LabelMedium: {
        fontSize: fontSize.rem12px,
        fontWeight: fontWeight.normal,
        lineHeight: lineHeight.lineHeight16px,
        letterSpacing:letterSpacing["letterSpacing0.5"]
    },
    LabelSmall: {
        fontSize: fontSize.rem11px,
        fontWeight: fontWeight.normal,
        lineHeight: lineHeight.lineHeight16px,
        letterSpacing: letterSpacing["letterSpacing0.5"]
    },
    bodyLarge: {
        fontSize: fontSize.rem16px,
        fontWeight: fontWeight.normal,
        lineHeight: lineHeight.lineHeight24px,
        letterSpacing: letterSpacing["letterSpacing0.5"],
    },
    bodyMedium: {
        fontSize: fontSize.rem14px,
        fontWeight: fontWeight.normal,
        lineHeight:lineHeight.lineHeight20px,
        letterSpacing: letterSpacing["letterSpacing0.25"],
    },
    bodySmall: {
        fontSize: fontSize.rem12px,
        fontWeight: fontWeight.normal,
        lineHeight: lineHeight.lineHeight18px,
        letterSpacing: "letterSpacing.letterSpacing0.4"
    },

}

/**
 * MUI Default, set for compatibility purpose, set to look like the Figma
 */
const muiTypography = {
    fontFamily: figmaTypography.fontFamily,
    htmlFontSize,
    fontSize: baseFontSize,
    fontWeightLight: figmaTypography.fontWeight.light,
    fontWeightRegular: figmaTypography.fontWeight.normal,
    fontWeightMedium: figmaTypography.fontWeight.medium,
    fontWeightBold: figmaTypography.fontWeight.bold,
    h1: {
        fontWeight: figmaTypography.heading.h1.fontWeight,
        fontSize: figmaTypography.heading.h1.fontSize,
    },
    h2: {
        fontWeight: figmaTypography.heading.h2.fontWeight,
        fontSize: figmaTypography.heading.h2.fontSize,
    },
    h3: {
        fontWeight: figmaTypography.heading.h3.fontWeight,
        fontSize: figmaTypography.heading.h3.fontSize,
    },
    h4: {
        fontWeight: figmaTypography.heading.h4.fontWeight,
        fontSize: figmaTypography.heading.h4.fontSize,
    },
    h5: {
        fontWeight: figmaTypography.heading.h5.fontWeight,
        fontSize: figmaTypography.heading.h5.fontSize,
    },
    h6: {
        fontWeight: figmaTypography.heading.h6.fontWeight,
        fontSize: figmaTypography.heading.h6.fontSize,
    },
    body1: {
        // This will be applied as default on html body tag
        fontWeight: figmaTypography.body.medium.fontWeight,
        fontSize: figmaTypography.body.medium.fontSize,
    },
    body2: {
        // @todo: validate this
        fontWeight: figmaTypography.body.small.fontWeight,
        fontSize: figmaTypography.body.small.fontSize,
    },
    subtitle1: {
        // @todo: validate this
        fontWeight: figmaTypography.body.medium.fontWeight,
        fontSize: figmaTypography.body.medium.fontSize,
    },
    subtitle2: {
        // @todo: validate this
        fontWeight: figmaTypography.body.small.fontWeight,
        fontSize: figmaTypography.body.small.fontSize,
    },
    button: {
        // @todo: validate this
        fontWeight: figmaTypography.body.medium.fontWeight,
        fontSize: figmaTypography.body.medium.fontSize,
    },
    caption: {
        // @todo: validate this
        fontWeight: figmaTypography.body.small.fontWeight,
        fontSize: figmaTypography.body.small.fontSize,
    },
    overline: {
        // @todo: validate this
        fontWeight: figmaTypography.body.small.fontWeight,
        fontSize: figmaTypography.body.small.fontSize,
    },
}

const typography = { ...muiTypography, ...themeCustomTypography,  lineHeight, letterSpacing, pxToRem }

export default typography
