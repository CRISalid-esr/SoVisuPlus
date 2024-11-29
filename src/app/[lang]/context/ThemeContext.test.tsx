import React from 'react'
import { render, screen } from '@testing-library/react'
import { ThemeProvider, useThemeContext, ThemeMode } from './ThemeContext' // Adjust path as necessary
import userEvent from '@testing-library/user-event'

// Test component to consume the ThemeContext
const TestComponent = () => {
  const { setTheme, currentTheme } = useThemeContext()

  return (
    <div>
      <span>Current Theme: {currentTheme}</span>
      <button onClick={() => setTheme(ThemeMode.light)}>Set Light Theme</button>
      <button onClick={() => setTheme(ThemeMode.dark)}>Set Dark Theme</button>
    </div>
  )
}

describe('ThemeProvider', () => {
  // Mock window.matchMedia to simulate dark mode system preference
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)', // Simulate dark mode preference
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    })
  })

  it('renders with the default theme as system', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    // Initially, the system preference is checked, and should be set to dark based on our mock
    expect(screen.getByText(/Current Theme:/i)).toHaveTextContent('Current Theme: system')
  })

  it('switches to light theme when setTheme is called with "light"', async () => {
    const user = userEvent.setup()

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    // Click the button to set light theme
    const lightButton = screen.getByRole('button', { name: /Set Light Theme/i })
    await user.click(lightButton)

    // Verify the current theme is set to light
    expect(screen.getByText(/Current Theme:/i)).toHaveTextContent('Current Theme: light')
  })

  it('switches to dark theme when setTheme is called with "dark"', async () => {
    const user = userEvent.setup()

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    // Click the button to set dark theme
    const darkButton = screen.getByRole('button', { name: /Set Dark Theme/i })
    await user.click(darkButton)

    // Verify the current theme is set to dark
    expect(screen.getByText(/Current Theme:/i)).toHaveTextContent('Current Theme: dark')
  })

  it('persists theme in localStorage', async () => {
    const user = userEvent.setup()

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    // Set theme to dark and check if it gets saved in localStorage
    const darkButton = screen.getByRole('button', { name: /Set Dark Theme/i })
    await user.click(darkButton)
    expect(localStorage.getItem('theme-mode')).toBe('dark')

    // Set theme to light and check if it gets saved in localStorage
    const lightButton = screen.getByRole('button', { name: /Set Light Theme/i })
    await user.click(lightButton)
    expect(localStorage.getItem('theme-mode')).toBe('light')
  })

  it('throws an error when useThemeContext is used outside ThemeProvider', () => {
    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {})

    const TestErrorComponent = () => {
      useThemeContext()
      return <div />
    }

    expect(() => render(<TestErrorComponent />)).toThrow(
      'useThemeContext must be used within a ThemeProvider'
    )

    consoleErrorMock.mockRestore()
  })
})
