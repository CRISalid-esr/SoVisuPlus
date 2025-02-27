import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import LanguageChips from './LanguageChips'
import { Literal } from '@/types/Literal'

// Mock MUI Theme
jest.mock('@mui/material/styles', () => ({
  ...jest.requireActual('@mui/material/styles'),
  useTheme: () => ({
    spacing: (factor: number) => `${factor * 8}px`,
  }),
}))

describe('LanguageChips Component', () => {
  const theme = createTheme()

  const renderComponent = (props: {
    texts: Literal[]
    selectedLang: string
    onLanguageSelect: jest.Mock
  }) =>
    render(
      <ThemeProvider theme={theme}>
        <LanguageChips {...props} />
      </ThemeProvider>,
    )

  it('renders language chips except undetermined language', () => {
    const mockOnLanguageSelect = jest.fn()
    const fr = new Literal('Bonjour', 'fr')
    const en = new Literal('Hello', 'en')
    const ul = new Literal('Undetermined Language', 'ul')
    const texts: Literal[] = [fr, en, ul]

    renderComponent({
      texts,
      selectedLang: 'en',
      onLanguageSelect: mockOnLanguageSelect,
    })

    expect(screen.getByText('en')).toBeInTheDocument()
    expect(screen.getByText('fr')).toBeInTheDocument()
    expect(screen.queryByText('ul')).not.toBeInTheDocument() // Should not render
  })

  it('highlights selected language chip', () => {
    const mockOnLanguageSelect = jest.fn()
    const fr = new Literal('Bonjour', 'fr')
    const en = new Literal('Hello', 'en')
    const ul = new Literal('Undetermined Language', 'ul')
    const texts: Literal[] = [fr, en, ul]
    renderComponent({
      texts,
      selectedLang: 'fr',
      onLanguageSelect: mockOnLanguageSelect,
    })

    const selectedChip = screen.getByText('fr')
    expect(selectedChip).toHaveClass('MuiChip-label') // Should be highlighted
  })

  it('calls onLanguageSelect when clicking on a different language chip', () => {
    const mockOnLanguageSelect = jest.fn()
    const fr = new Literal('Bonjour', 'fr')
    const en = new Literal('Hello', 'en')
    const ul = new Literal('Undetermined Language', 'ul')
    const texts: Literal[] = [fr, en, ul]

    renderComponent({
      texts,
      selectedLang: 'en',
      onLanguageSelect: mockOnLanguageSelect,
    })

    const frChip = screen.getByText('fr')
    fireEvent.click(frChip)

    expect(mockOnLanguageSelect).toHaveBeenCalledWith('fr')
  })

  it('prevents clicking on already selected language chip', () => {
    const mockOnLanguageSelect = jest.fn()
    const fr = new Literal('Bonjour', 'fr')
    const en = new Literal('Hello', 'en')
    const ul = new Literal('Undetermined Language', 'ul')
    const texts: Literal[] = [fr, en, ul]
    renderComponent({
      texts,
      selectedLang: 'en',
      onLanguageSelect: mockOnLanguageSelect,
    })

    const enChip = screen.getByText('en')
    fireEvent.click(enChip)

    expect(mockOnLanguageSelect).not.toHaveBeenCalled() // Should not trigger callback
  })
})
