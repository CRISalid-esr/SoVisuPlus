import { render, screen } from '@testing-library/react'
import { I18nProvider } from '@lingui/react'
import { i18n } from '@lingui/core'
import { OrcidLoginButton } from '@/app/[lang]/account/components/myProfile/components/identifiers/OrciLoginButton'

jest.mock('@/utils/runtimeEnv', () => ({
  getRuntimeEnv: () => ({
    NEXT_PUBLIC_ORCID_CLIENT_ID: 'client-id',
    NEXT_PUBLIC_ORCID_URL: 'https://orcid.org',
    NEXT_PUBLIC_ORCID_SCOPES: '/authenticate',
    NEXT_PUBLIC_BASE_URL: 'https://example.com',
  }),
}))

i18n.load({
  en: {
    orcid_button_update_identifier: 'Update ORCID identifier',
    orcid_button_provide_identifier: 'Provide ORCID identifier',
  },
})
i18n.activate('en')

const renderWithProviders = (props: { orcidProvided: boolean }) =>
  render(
    <I18nProvider i18n={i18n}>
      <OrcidLoginButton {...props} />
    </I18nProvider>,
  )

describe('OrcidLoginButton', () => {
  it('displays "update identifier" text if ORCID is provided', () => {
    renderWithProviders({ orcidProvided: true })

    expect(
      screen.getByRole('link', {
        name: `ORCID logo ${i18n.t('orcid_button_update_identifier')}`,
      }),
    ).toBeInTheDocument()
  })

  it('displays "provide identifier" text if ORCID is not provided', () => {
    renderWithProviders({ orcidProvided: false })

    expect(
      screen.getByRole('link', {
        name: `ORCID logo ${i18n.t('orcid_button_provide_identifier')}`,
      }),
    ).toBeInTheDocument()
  })

  it('has correct href URL for ORCID authorization', () => {
    renderWithProviders({ orcidProvided: false })

    const expectedRedirect = encodeURIComponent(
      'https://example.com/api/orcid/callback?lang=en',
    )
    const expectedScope = encodeURIComponent('/authenticate')

    const expectedHref = `https://orcid.org/oauth/authorize?client_id=client-id&response_type=code&scope=${expectedScope}&redirect_uri=${expectedRedirect}`

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', expectedHref)
  })
})
