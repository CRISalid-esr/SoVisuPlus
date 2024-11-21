import '@testing-library/jest-dom' // Ensure matchers are available
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Home from './page'
import { useRouter } from 'next/navigation'
import { I18nProvider } from '@lingui/react'
import { messages as enMessages } from '@/locales/en/messages'
import { messages as frMessages } from '@/locales/fr/messages'
import { i18n } from '@lingui/core'

// Mock `useRouter` from Next.js
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock the `Trans` component for translations
jest.mock('@lingui/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}))

describe('Home Component', () => {
  it('renders and updates language when Select is changed', async () => {
    const pushMock = jest.fn()

    ;(useRouter as jest.Mock).mockReturnValue({
      push: pushMock,
    })

    const mockParams = Promise.resolve({ lang: 'en' })
    const messages = { en: enMessages, fr: frMessages }
    const locale = 'en'
    i18n.loadAndActivate({ locale, messages })

    // Render the Home component wrapped in the I18nProvider
    render(
      <I18nProvider i18n={i18n}>
        <Home params={mockParams} />
      </I18nProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('home_page_main_title')).toBeInTheDocument()
    })

    await waitFor(() => {
      const selectOption = document.getElementById(
        'language-select',
      ) as HTMLElement
      expect(selectOption).toHaveTextContent('English')
    })

    const selectOption = document.getElementById(
      'language-select',
    ) as HTMLElement

    fireEvent.mouseDown(selectOption)
    const frOption = document.getElementById('fr') as HTMLElement

    expect(frOption).toBeInTheDocument()
    expect(frOption).toHaveTextContent('Français')

    fireEvent.click(frOption)
  
    expect(pushMock).toHaveBeenCalledWith('/fr')

  })
})
