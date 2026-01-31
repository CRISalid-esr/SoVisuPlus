import { render, screen } from '@testing-library/react'
import { I18nProvider } from '@lingui/react'
import { i18n } from '@lingui/core'
import { HalLoginButton } from '@/app/[lang]/account/components/myProfile/components/identifiers/HalLoginButton'

jest.mock('@/utils/runtimeEnv', () => ({
  getRuntimeEnv: () => ({
    NEXT_PUBLIC_CAS_URL: 'https://cas.ccsd.cnrs.fr/cas',
    NEXT_PUBLIC_BASE_URL: 'https://example.com',
  }),
}))

i18n.load({
  en: {
    hal_button_update_identifier: 'Update HAL identifier',
    hal_button_provide_identifier: 'Provide HAL identifier',
  },
})
i18n.activate('en')

const renderWithProviders = (props: { halProvided: boolean }) =>
  render(
    <I18nProvider i18n={i18n}>
      <HalLoginButton {...props} />
    </I18nProvider>,
  )

describe('HalLoginButton', () => {
  it('displays "update identifier" text if HAL identifier is provided', () => {
    renderWithProviders({ halProvided: true })

    expect(
      screen.getByRole('link', {
        name: `HAL logo ${i18n.t('hal_button_update_identifier')}`,
      }),
    ).toBeInTheDocument()
  })

  it('displays "provide identifier" text if HAL identifier is not provided', () => {
    renderWithProviders({ halProvided: false })

    expect(
      screen.getByRole('link', {
        name: `HAL logo ${i18n.t('hal_button_provide_identifier')}`,
      }),
    ).toBeInTheDocument()
  })

  it('has correct href URL for CAS login (service includes lang)', () => {
    renderWithProviders({ halProvided: false })

    const expectedService = encodeURIComponent(
      'https://example.com/api/cas/login?lang=en',
    )

    const expectedHref = `https://cas.ccsd.cnrs.fr/cas/login?service=${expectedService}`

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', expectedHref)
  })
})
