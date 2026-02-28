import { render, waitFor } from '@testing-library/react'
import fs from 'fs'
import path from 'path'
import Home from './page' // Import the server component
import Splash from './splash'
jest.mock('fs')

// Mock external dependencies
//TODO:fix linting
// eslint-disable-next-line react/display-name
jest.mock('./components/UnauthenticatedRoute', () =>
  // eslint-disable-next-line react/display-name
  ({ children }: { children: React.ReactNode }) => (
    <div className='unauthenticated-route'>{children}</div>
  ),
)

//TODO:fix linting
// eslint-disable-next-line react/display-name
jest.mock('./splash', () =>
  jest.fn(() => <div className='splash'>Splash Component</div>),
)

describe('Home Server Component', () => {
  it('renders the Splash component inside UnauthenticatedRoute', async () => {
    // Render the component
    const { container } = render(await Home())

    // Assertions using DOM structure
    const unauthenticatedRoute = container.querySelector(
      '.unauthenticated-route',
    )
    const splash = container.querySelector('.splash')

    expect(unauthenticatedRoute).toBeInTheDocument()
    expect(splash).toBeInTheDocument()
  })
})

describe('getSplashImages tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockExistsSync = (mockFilesTree: Record<string, boolean>) => {
    ;(fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
      return !!mockFilesTree[filePath]
    })
  }

  it('should return both default background and logo images if no custom files', async () => {
    mockExistsSync({})

    render(await Home())
    await waitFor(() =>
      expect(Splash).toHaveBeenCalledWith(
        expect.objectContaining({
          images: {
            backgroundUrl: '/theme/defaults/splash_background_default.svg',
            logoUrl: '/theme/defaults/splash_org_logo_default.svg',
          },
        }),
        {},
      ),
    )
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

    render(await Home())
    await waitFor(() =>
      expect(Splash).toHaveBeenCalledWith(
        expect.objectContaining({
          images: {
            backgroundUrl: '/theme/splash_background.png',
            logoUrl: '/theme/splash_org_logo.svg',
          },
        }),
        {},
      ),
    )
  })
})
