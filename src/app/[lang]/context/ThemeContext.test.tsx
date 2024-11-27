import React from 'react'
import { render, screen } from '@testing-library/react'
import { ThemeProvider, useThemeContext } from './ThemeContext'
import userEvent from '@testing-library/user-event'

// Test component to consume the ThemeContext
const TestComponent = () => {
  const { toggleTheme, currentTheme } = useThemeContext()

  return (
    <div>
      <span>Current Theme: {currentTheme}</span>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  )
}

describe('ThemeProvider', () => {
  it('renders with the default theme as light', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    )
    // Verify default theme
    expect(screen.getByText(/Current Theme:/i)).toHaveTextContent(
      'Current Theme: light',
    )
  })

  it('toggles between light and dark themes', async () => {
    const user = userEvent.setup()

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    )

    // Verify default theme
    expect(screen.getByText(/Current Theme: light/i)).toBeInTheDocument()

    // Simulate theme toggle
    const toggleButton = screen.getByRole('button', { name: /toggle theme/i })
    await user.click(toggleButton)

    // Verify theme changes to dark
    expect(screen.getByText(/Current Theme: dark/i)).toBeInTheDocument()

    // Toggle back to light
    await user.click(toggleButton)
    expect(screen.getByText(/Current Theme: light/i)).toBeInTheDocument()
  })

  it('throws an error when useThemeContext is used outside ThemeProvider', () => {
    // Suppress console error output for this test
    const consoleErrorMock = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    const renderOutsideProvider = () => {
      const TestErrorComponent = () => {
        useThemeContext()
        return <div />
      }

      render(<TestErrorComponent />)
    }

    expect(renderOutsideProvider).toThrow(
      'useThemeContext must be used within a ThemeProvider',
    )

    consoleErrorMock.mockRestore()
  })
})
