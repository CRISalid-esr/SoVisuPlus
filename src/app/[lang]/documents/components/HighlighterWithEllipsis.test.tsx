// Tests that the component renders either the highlighted text or custom children
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { ReactNode } from 'react'
import HighlighterWithEllipsis from '@/app/[lang]/documents/components/HighlighterWithEllipsis'

const renderWithI18n = (ui: ReactNode) =>
  render(<I18nProvider i18n={i18n}>{ui}</I18nProvider>)

describe('HighlighterWithEllipsis', () => {
  beforeAll(() => {
    i18n.load('en', {})
    i18n.activate('en')
  })

  it('highlights search words in text', () => {
    renderWithI18n(
      <HighlighterWithEllipsis
        text='John Doe, Jane Roe'
        searchWords={['Jane']}
      />,
    )

    expect(screen.getByText('Jane')).toHaveClass('highlight')
  })

  it('renders children instead of text', () => {
    renderWithI18n(
      <HighlighterWithEllipsis>
        {() => <span>Custom content</span>}
      </HighlighterWithEllipsis>,
    )

    expect(screen.getByText('Custom content')).toBeInTheDocument()
  })
})
