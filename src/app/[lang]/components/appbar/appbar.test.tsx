import { render, screen, fireEvent } from '@testing-library/react'
import Appbar from './appbar'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import '@testing-library/jest-dom'

describe('Appbar Component', () => {
  it('renders AppBar with correct logo and button', () => {
    // Mock the handleToggleDrawer function
    const mockHandleToggleDrawer = jest.fn()

    // Create a basic theme with pxToRem mock
    const theme = createTheme({
      typography: {
        fontSize: 14,
      },
      utils: {
        pxToRem: (value: number) => `${value / 16}rem`, // Mocking pxToRem function
      },
    })

    render(
      <ThemeProvider theme={theme}>
        <Appbar handleToggleDrawer={mockHandleToggleDrawer} />
      </ThemeProvider>
    )

    // Check if the logos are rendered
    expect(screen.getByAltText('Crisalid logo')).toBeInTheDocument()
    expect(screen.getByAltText('Crisalid logo').getAttribute('src')).toBe('/icons/logo.svg')

    expect(screen.getByAltText('Crisalid logo plus')).toBeInTheDocument()
    expect(screen.getByAltText('Crisalid logo plus').getAttribute('src')).toBe('/soVisuPlus.svg')

    // Check if the IconButton with Menu icon is rendered
    const menuButton = screen.getByLabelText('menu')
    expect(menuButton).toBeInTheDocument()

    // Simulate a click event on the button
    fireEvent.click(menuButton)

    // Check if the handleToggleDrawer function was called
    expect(mockHandleToggleDrawer).toHaveBeenCalledTimes(1)
  })
})
