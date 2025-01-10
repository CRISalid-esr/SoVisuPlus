import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Appbar from './Appbar'
import { ThemeProvider, ThemeMode } from '../../context/ThemeContext'
import { universityLogos } from '../../../../../configs'

// Mock Next.js Image component
jest.mock('next/image', () => ({ src, alt, width, height, style }: any) => (
  <img src={src} alt={alt} style={{ ...style, width, height }} />
))

describe('Appbar Component', () => {
  const handleToggleDrawerMock = jest.fn()

  beforeEach(() => {
    // Mock localStorage
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'theme-mode') return ThemeMode.light
      return null
    })
    Storage.prototype.setItem = jest.fn()

    // Mock matchMedia
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)' ? false : true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }))
  })

  const renderComponent = () =>
    render(
      <ThemeProvider>
        <Appbar handleToggleDrawer={handleToggleDrawerMock} />
      </ThemeProvider>,
    )

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('renders without crashing', () => {
    renderComponent()
    expect(screen.getByAltText('Crisalid logo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument()
  })

  test('calls handleToggleDrawer when menu button is clicked', () => {
    renderComponent()
    const menuButton = screen.getByRole('button', { name: /menu/i })
    fireEvent.click(menuButton)
    expect(handleToggleDrawerMock).toHaveBeenCalledTimes(1)
  })

  test('displays the correct logo for light theme', () => {
    renderComponent()
    const logo = screen.getByAltText('Crisalid logo')
    expect(logo).toHaveAttribute('src', universityLogos.lightSideBarLogo)
  })

  test('displays the correct logo for dark theme', () => {
    renderComponent()
    const logo = screen.getByAltText('Crisalid logo')
    expect(logo).toHaveAttribute('src', universityLogos.darkSideBarLogo)
  })
})
