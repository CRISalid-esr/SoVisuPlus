import { render, screen } from '@testing-library/react'
import { I18nProvider } from '@lingui/react'
import { i18n } from '@lingui/core'
import { OrcidLoginButton } from '@/app/[lang]/account/components/myProfile/components/identifiers/OrcidLoginButton'

jest.mock('@/utils/runtimeEnv', () => ({
  getRuntimeEnv: () => ({
    ORCID_CLIENT_ID: 'client-id',
    ORCID_URL: 'https://orcid.org',
    // include an optional scope so the scope param contains more than /authenticate
    ORCID_SCOPES: '/authenticate,/read-limited',
    NEXT_PUBLIC_BASE_URL: 'https://example.com',
    NEXT_PUBLIC_INSTITUTION_NAME: 'XYZ Université',
  }),
}))

i18n.load({
  en: {
    orcid_button_update_identifier: 'Update ORCID identifier',
    orcid_button_provide_identifier: 'Provide ORCID identifier',

    // permissions box
    orcid_permissions_none: 'You grant no permissions to {institutionName}.',
    orcid_permissions_intro:
      'Here are the permissions you grant to {institutionName}:',
    orcid_permission_read_limited: 'Read limited information',

    // checkbox labels (t`...`)
    orcid_scope_read_limited: 'read-limited',
    orcid_scope_person_update: 'person/update',
    orcid_scope_activities_update: 'activities/update',
  },
})
i18n.activate('en')

const renderWithProviders = (props: {
  orcidProvided: boolean
  hasOauth?: boolean
  grantedScopes?: Array<
    '/read-limited' | '/person/update' | '/activities/update' | '/authenticate'
  > | null
}) =>
  render(
    <I18nProvider i18n={i18n}>
      <OrcidLoginButton
        orcidProvided={props.orcidProvided}
        hasOauth={props.hasOauth ?? false}
        grantedScopes={props.grantedScopes ?? null}
      />
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

  it('renders "no permissions" text when oauth is missing', () => {
    renderWithProviders({
      orcidProvided: false,
      hasOauth: false,
      grantedScopes: null,
    })

    expect(
      screen.getByText('You grant no permissions to XYZ Université.'),
    ).toBeInTheDocument()
  })

  it('renders permissions intro + bullet when oauth is present and grantedScopes include readable scope', () => {
    renderWithProviders({
      orcidProvided: true,
      hasOauth: true,
      grantedScopes: ['/authenticate', '/read-limited'],
    })

    expect(
      screen.getByText('Here are the permissions you grant to XYZ Université:'),
    ).toBeInTheDocument()

    expect(screen.getByText('Read limited information')).toBeInTheDocument()
  })

  it('has correct href URL for ORCID authorization', () => {
    renderWithProviders({ orcidProvided: false })

    const expectedRedirect = encodeURIComponent(
      'https://example.com/api/orcid/callback?lang=en',
    )

    // ORCID_SCOPES => optionalScopes contains /read-limited (checked by default)
    // scopeParam => "/authenticate /read-limited" => encoded once
    const expectedScope = encodeURIComponent('/authenticate /read-limited')

    const expectedHref =
      `https://orcid.org/oauth/authorize?client_id=client-id` +
      `&response_type=code&scope=${expectedScope}` +
      `&redirect_uri=${expectedRedirect}`

    const link = screen.getByRole('link', {
      name: `ORCID logo ${i18n.t('orcid_button_provide_identifier')}`,
    })
    expect(link).toHaveAttribute('href', expectedHref)
  })
})
