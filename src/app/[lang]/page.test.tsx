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
      const select = document.getElementById(
        'demo-simple-select-filled',
      ) as HTMLElement
      expect(select).toHaveTextContent('English')
    })

    const select = document.getElementById(
      'demo-simple-select-filled',
    ) as HTMLElement

    await waitFor(() => {
   
    })

    fireEvent.mouseDown(select)
    const frOption = screen.getByTestId('fr')
    expect(frOption).toBeInTheDocument()
    fireEvent.click(frOption)
/*
    await waitFor(() => {
      expect(select).toHaveTextContent('Français')
    })*/

    expect(pushMock).toHaveBeenCalledWith('/fr')

  })
})
