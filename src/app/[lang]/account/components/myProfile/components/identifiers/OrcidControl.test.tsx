import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

jest.mock('next-auth/react', () => ({
  __esModule: true,
  useSession: jest.fn(),
}))

import { useSession } from 'next-auth/react'
import { makeAssignment, makeAuthzContext } from '@/app/auth/context'
import { PermissionAction, PermissionSubject } from '@/types/Permission'

const mockRouter = { replace: jest.fn() }
const mockUseSearchParams = jest.fn(() => new URLSearchParams())

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

const mockOrcidLoginButton = jest.fn((props: OrcidLoginButtonProps) => (
  <div
    data-testid='OrcidLoginButton'
    data-provided={String(props.orcidProvided)}
  />
))

jest.mock(
  '@/[lang]/account/components/myProfile/components/identifiers/OrcidLoginButton',
  () => ({
    __esModule: true,
    OrcidLoginButton: (props: OrcidLoginButtonProps) =>
      mockOrcidLoginButton(props),
  }),
)

// The ORCID preview is mocked to immediately signal readiness so Save enables.
jest.mock('./OrcidInfoBox', () => {
  const ReactActual = jest.requireActual('react')
  const MockOrcidInfoBox = ({ onReady }: { onReady?: () => void }) => {
    ReactActual.useEffect(() => {
      onReady?.()
    }, [onReady])
    return <div data-testid='orcid-info-box' />
  }
  return { __esModule: true, default: MockOrcidInfoBox }
})

const renderWithProviders = () =>
  render(
    <I18nProvider i18n={i18n}>
      <OrcidControl />
    </I18nProvider>,
  )

// Global (unscoped) account_editor → wide scope
const authzGlobal = makeAuthzContext({
  personUid: 'person-uid',
  roleAssignments: [
    makeAssignment('account_editor', [
      {
        action: PermissionAction.update,
        subject: PermissionSubject.Person,
        fields: ['identifiers'],
      },
    ]),
  ],
})

const setupSession = (authz: unknown) => {
  ;(useSession as jest.Mock).mockReturnValue({
    data: authz ? { user: { authz } } : null,
  })
}

const mockAddPersonIdentifier = jest.fn()
const mockRemovePersonIdentifier = jest.fn()

const setupStore = ({
  person = null,
  currentPerspective = null,
  ownPerspective = true,
}: {
  person?: Person | null
  currentPerspective?: Person | null
  ownPerspective?: boolean
}) => {
  ;(useStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: unknown) => unknown) =>
      selector({
        user: {
          connectedUser: person ? { person } : null,
          currentPerspective,
          ownPerspective,
          addPersonIdentifier: mockAddPersonIdentifier,
          removePersonIdentifier: mockRemovePersonIdentifier,
        },
      }),
  )
}

const buildPerson = (identifiers: PersonIdentifier[]) =>
  new Person(
    'person-uid',
    false,
    'jdoe@example.com',
    'John Doe',
    'John',
    'Doe',
    [new PersonIdentifier(PersonIdentifierType.local, 'jd'), ...identifiers],
    [],
  )

const authenticatedOrcid = new ORCIDIdentifier('0000-0001-7990-9804', {
  scope: ['/read-limited'],
  tokenType: 'bearer',
  obtainedAt: new Date('2026-02-01T12:34:28.632Z'),
  expiresAt: new Date('2027-02-01T12:34:28.632Z'),
  createdAt: new Date('2026-02-01T12:34:28.632Z'),
  updatedAt: new Date('2026-02-01T12:34:28.632Z'),
})

// A non-authenticated ORCID has no OAuth grant
const plainOrcid = new ORCIDIdentifier('0000-0001-7990-9804')

describe('OrcidControl', () => {
  beforeAll(() => {
    i18n.load('en', {})
    i18n.activate('en')
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSearchParams.mockReturnValue(new URLSearchParams())
    mockAddPersonIdentifier.mockResolvedValue({ success: true })
    mockRemovePersonIdentifier.mockResolvedValue({ success: true })
    setupSession(authzGlobal)
  })

  it('authenticated ORCID: shows link icon + Remove, no auth button', () => {
    setupStore({ person: buildPerson([authenticatedOrcid]) })
    renderWithProviders()

    expect(screen.getByTestId('LinkIcon')).toBeInTheDocument()
    expect(screen.getByText('orcid_control_remove_button')).toBeInTheDocument()
    expect(screen.queryByTestId('OrcidLoginButton')).not.toBeInTheDocument()
  })

  it('non-authenticated ORCID on own account: shows auth button + Remove', () => {
    setupStore({ person: buildPerson([plainOrcid]) })
    renderWithProviders()

    expect(screen.getByTestId('OrcidLoginButton')).toBeInTheDocument()
    expect(screen.getByText('orcid_control_remove_button')).toBeInTheDocument()
    expect(screen.queryByTestId('LinkIcon')).not.toBeInTheDocument()
  })

  it('no ORCID + wide scope: shows auth button and manual add form', () => {
    setupStore({ person: buildPerson([]) })
    renderWithProviders()

    expect(screen.getByTestId('OrcidLoginButton')).toBeInTheDocument()
    expect(screen.getByText('manual_identifier_add_button')).toBeInTheDocument()
  })

  it('manual add verifies (ORCID preview) before submitting', async () => {
    setupStore({ person: buildPerson([]) })
    renderWithProviders()

    fireEvent.click(screen.getByText('manual_identifier_add_button'))
    fireEvent.change(screen.getByLabelText('ORCID'), {
      target: { value: '0000-0002-1825-0097' },
    })
    fireEvent.click(screen.getByText('manual_identifier_verify_button'))

    // Preview shown, then Save becomes available once it signals readiness
    expect(await screen.findByTestId('orcid-info-box')).toBeInTheDocument()
    fireEvent.click(await screen.findByText('manual_identifier_save_button'))

    await waitFor(() =>
      expect(mockAddPersonIdentifier).toHaveBeenCalledWith(
        'person-uid',
        PersonIdentifierType.orcid,
        '0000-0002-1825-0097',
      ),
    )
  })

  it('remove authenticated ORCID calls removePersonIdentifier', async () => {
    setupStore({ person: buildPerson([authenticatedOrcid]) })
    renderWithProviders()

    fireEvent.click(screen.getByText('orcid_control_remove_button'))
    fireEvent.click(screen.getByText('orcid_control_remove_dialog_confirm'))

    await waitFor(() =>
      expect(mockRemovePersonIdentifier).toHaveBeenCalledWith(
        'person-uid',
        PersonIdentifierType.orcid,
      ),
    )
  })

  it('no permission: read-only, no action buttons', () => {
    setupSession(null)
    setupStore({ person: buildPerson([plainOrcid]) })
    renderWithProviders()

    expect(screen.queryByTestId('OrcidLoginButton')).not.toBeInTheDocument()
    expect(
      screen.queryByText('orcid_control_remove_button'),
    ).not.toBeInTheDocument()
  })

  it('shows snackbar on ?success=orcid_authentication_success', () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams('success=orcid_authentication_success'),
    )
    setupStore({ person: buildPerson([]) })
    renderWithProviders()

    expect(screen.getByText('orcid_authentication_success')).toBeInTheDocument()
  })
})
