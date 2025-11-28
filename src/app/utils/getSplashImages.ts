import fs from 'fs'
import path from 'path'

const THEME_DIR = path.join(process.cwd(), 'public', 'theme')
const BACKGROUND_BASENAME = 'splash_background'
const LOGO_BASENAME = 'splash_org_logo'
const EXTENSIONS = ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif']

export const getSplashImages = () => {
  let backgroundPath = '/theme/defaults/splash_background_default.svg'
  let logoPath = '/theme/defaults/splash_org_logo_default.svg'

  EXTENSIONS.forEach((extension) => {
    const background = path.join(
      THEME_DIR,
      BACKGROUND_BASENAME + '.' + extension,
    )
    const logo = path.join(THEME_DIR, LOGO_BASENAME + '.' + extension)
    if (fs.existsSync(background)) {
      backgroundPath = '/theme/' + BACKGROUND_BASENAME + '.' + extension
    } else if (fs.existsSync(logo)) {
      logoPath = '/theme/' + LOGO_BASENAME + '.' + extension
    }
  })

  return { backgroundUrl: backgroundPath, logoUrl: logoPath }
}
