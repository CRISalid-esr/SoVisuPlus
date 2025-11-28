import fs from 'fs'
import { getSplashImages } from './getSplashImages'
import path from 'path'

jest.mock('fs')

describe('getSplashImages tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  function mockExistsSync(mockFilesTree: Record<string, boolean>) {
    ;(fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
      return !!mockFilesTree[filePath]
    })
  }

  it('should return both default background and logo images if no custom files', async () => {
    mockExistsSync({})

    const images = getSplashImages()

    expect(images.backgroundUrl).toBe(
      '/theme/defaults/splash_background_default.svg',
    )
    expect(images.logoUrl).toBe('/theme/defaults/splash_org_logo_default.svg')
  })

  it('should return background and logo custom files if existing', async () => {
    const backgroundPath = path.join(
      process.cwd(),
      'public',
      'theme',
      'splash_background.png',
    )
    const logoPath = path.join(
      process.cwd(),
      'public',
      'theme',
      'splash_org_logo.svg',
    )
    mockExistsSync({
      [backgroundPath]: true,
      [logoPath]: true,
    })

    const images = getSplashImages()

    expect(images.backgroundUrl).toBe('/theme/splash_background.png')
    expect(images.logoUrl).toBe('/theme/splash_org_logo.svg')
  })
})
