import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import useStore from '@/stores/global_store'
import OrcidControl from './OrcidControl'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { Person } from '@/types/Person'
import { PersonIdentifier } from '@/types/PersonIdentifier'
import { ORCIDIdentifier, OrcidScope } from '@/types/OrcidIdentifier'
import { PersonIdentifierType } from '@prisma/client'

jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

type NextRouterMock = {
  replace: jest.Mock<void, [string, { scroll: boolean }]>
}

const mockRouter: NextRouterMock = {
  replace: jest.fn<void, [string, { scroll: boolean }]>(),
}

const mockUseSearchParams = jest.fn<URLSearchParams, []>(
  () => new URLSearchParams(),
)

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockUseSearchParams(),
}))

jest.mock('@kit-data-manager/react-pid-component', () => ({
  __esModule: true,
  PidComponent: ({ value }: { value: string }) => (
    <div data-testid='PidComponent'>{value}</div>
  ),
}))

type OrcidLoginButtonProps = {
  orcidProvided: boolean
  grantedScopes: OrcidScope[] | null
  hasOauth: boolean
}

const mockOrcidLoginButton = jest.fn<JSX.Element, [OrcidLoginButtonProps]>(
  (props) => (
    <div
      data-testid='OrcidLoginButton'
      data-orcid-provided={String(props.orcidProvided)}
      data-has-oauth={String(props.hasOauth)}
      data-granted-scopes={(props.grantedScopes ?? []).join(',')}
    />
  ),
)

jest.mock(
  '@/[lang]/account/components/myProfile/components/identifiers/OrcidLoginButton',
  () => ({
    __esModule: true,
    OrcidLoginButton: (props: OrcidLoginButtonProps) =>
      mockOrcidLoginButton(props),
  }),
)

const renderWithProviders = () =>
  render(
    <I18nProvider i18n={i18n}>
      <OrcidControl />
    </I18nProvider>,
  )

describe('OrcidControl', () => {
  beforeAll(() => {
    i18n.load({
      en: {
        orcid_identifier_no_orcid_provided: 'No ORCID provided',
        orcid_control_helper: 'Helper <0>orcid.org</0>',
        orcid_authentication_success: 'ORCID authentication success',
        orcid_account_linked_tooltip: 'ORCID account linked',
      },
    })
    i18n.activate('en')
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSearchParams.mockReturnValue(new URLSearchParams())
  })

  it('renders ORCID value (mobile text block) and passes props to OrcidLoginButton when linked', () => {
    const orcid = new ORCIDIdentifier('0000-0001-7990-9804', {
      scope: ['/read-limited'],
      tokenType: 'bearer',
      obtainedAt: new Date('2026-02-01T12:34:28.632Z'),
      expiresAt: new Date('2027-02-01T12:34:28.632Z'),
      createdAt: new Date('2026-02-01T12:34:28.632Z'),
      updatedAt: new Date('2026-02-01T12:34:28.632Z'),
      // tokens are optional in OrcidOAuthData
    })

    const person = new Person(
      'person-uid',
      false,
      'jdoe@example.com',
      'John Doe',
      'John',
      'Doe',
      [new PersonIdentifier(PersonIdentifierType.local, 'jd'), orcid],
      [],
    )

    ;(useStore as unknown as jest.Mock).mockImplementation(
      (selector: (s: unknown) => unknown) =>
        selector({
          user: {
            connectedUser: {
              person,
            },
          },
        }),
    )

    renderWithProviders()

    // ORCID value should be present in the "mobile" text block
    expect(screen.getAllByText('0000-0001-7990-9804')).toHaveLength(2) // appears twice

    expect(screen.getByTestId('LinkIcon')).toBeInTheDocument()

    expect(mockOrcidLoginButton).toHaveBeenCalledTimes(1)
    expect(mockOrcidLoginButton).toHaveBeenCalledWith({
      orcidProvided: true,
      grantedScopes: ['/read-limited'],
      hasOauth: true,
    })
  })

  it('renders fallback text when ORCID is missing and passes props to OrcidLoginButton', () => {
    const person = new Person(
      'person-uid',
      false,
      'jdoe@example.com',
      'John Doe',
      'John',
      'Doe',
      [new PersonIdentifier(PersonIdentifierType.local, 'jd')],
      [],
    )

    ;(useStore as unknown as jest.Mock).mockImplementation(
      (selector: (s: unknown) => unknown) =>
        selector({
          user: {
            connectedUser: {
              person,
            },
          },
        }),
    )

    renderWithProviders()

    expect(screen.getByText('No ORCID provided')).toBeInTheDocument()
    expect(screen.queryByTestId('LinkIcon')).not.toBeInTheDocument()

    expect(mockOrcidLoginButton).toHaveBeenCalledWith({
      orcidProvided: false,
      grantedScopes: null,
      hasOauth: false,
    })
  })

  it('shows snackbar when success=orcid_* is present', () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams('success=orcid_authentication_success'),
    )
    ;(useStore as unknown as jest.Mock).mockImplementation(
      (selector: (s: unknown) => unknown) =>
        selector({
          user: { connectedUser: null },
        }),
    )

    renderWithProviders()

    expect(screen.getByText('ORCID authentication success')).toBeInTheDocument()
  })

  it('ignores non-orcid success messages', () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams('success=hal_authentication_success'),
    )
    ;(useStore as unknown as jest.Mock).mockImplementation(
      (selector: (s: unknown) => unknown) =>
        selector({
          user: { connectedUser: null },
        }),
    )

    renderWithProviders()

    expect(
      screen.queryByText('ORCID authentication success'),
    ).not.toBeInTheDocument()
  })
})
