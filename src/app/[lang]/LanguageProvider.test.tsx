import { Trans } from '@lingui/react/macro'
// Import jest-dom at the top of your test file
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { LanguageProvider } from './LanguageProvider'

describe('LanguageProvider', () => {
  it('renders children with correct language translations for en', () => {
    const messages = {
      en: { hello: 'Hello' },
    }

    const TestComponent = () => <Trans id='hello'>Hello</Trans>

    // Test with English locale
    render(
      <LanguageProvider messages={messages.en} locale='en'>
        <TestComponent />
      </LanguageProvider>,
    )
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('renders children with correct language translations for fr', () => {
    const messages = {
      fr: { hello: 'Bonjour' },
    }

    const TestComponent = () => <Trans id='hello'>Hello</Trans>

    // Test with French locale
    render(
      <LanguageProvider messages={messages.fr} locale='fr'>
        <TestComponent />
      </LanguageProvider>,
    )
    expect(screen.getByText('Bonjour')).toBeInTheDocument()
  })
})
