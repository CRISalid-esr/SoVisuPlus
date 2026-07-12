import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '@lingui/react'
import { i18n } from '@lingui/core'
import HalControl from '@/app/[lang]/account/components/myProfile/components/identifiers/HalControl'
import useStore from '@/stores/global_store'
import { PersonIdentifierType } from '@prisma/client'

const mockReplace = jest.fn()
const mockUseSearchParams = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockUseSearchParams(),
}))

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

jest.mock(
  '@/[lang]/account/components/myProfile/components/identifiers/HalLoginButton',
  () => ({
    HalLoginButton: ({ halProvided }: { halProvided: boolean }) => (
      <a data-testid='hal-login-button'>
        HalLoginButton(halProvided={String(halProvided)})
      </a>
    ),
  }),
)

i18n.load('en', {})
i18n.activate('en')

const renderWithProviders = () =>
  render(
    <I18nProvider i18n={i18n}>
      <HalControl />
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

const makeStore = (
  identifiers: Array<{ type: string; value: string }>,
  ownPerspective = true,
) => {
  const has = (type: string) => identifiers.some((i) => i.type === type)
  const person = {
    uid: 'person-uid',
    getIdentifiers: () => identifiers,
    hasIdentifier: (type: string) => has(type),
    isIdentifierAuthenticated: (type: string) =>
      (type === PersonIdentifierType.idhals ||
        type === PersonIdentifierType.idhali) &&
      has(PersonIdentifierType.hal_login),
    authzProperties: {
      __type: 'Person',
      perimeter: { Person: ['person-uid'], ResearchUnit: [] },
    },
  }
  ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
    selector({
      user: {
        connectedUser: { person },
        currentPerspective: null,
        ownPerspective,
        addPersonIdentifier: mockAddPersonIdentifier,
        removePersonIdentifier: mockRemovePersonIdentifier,
      },
    }),
  )
}

describe('HalControl', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSearchParams.mockReturnValue(new URLSearchParams())
    mockAddPersonIdentifier.mockResolvedValue({ success: true })
    mockRemovePersonIdentifier.mockResolvedValue({ success: true })
    setupSession(authzGlobal)
  })

  it('no HAL identifier: shows auth button and manual add form', () => {
    makeStore([])
    renderWithProviders()

    expect(screen.getByTestId('hal-login-button')).toHaveTextContent(
      'halProvided=false',
    )
    expect(screen.getByText('manual_identifier_add_button')).toBeInTheDocument()
    expect(screen.queryByTestId('LinkIcon')).not.toBeInTheDocument()
  })

  it('non-authenticated idHAL: badge + auth button + Remove, no link icon', () => {
    makeStore([{ type: PersonIdentifierType.idhals, value: 'jacques-dupont' }])
    renderWithProviders()

    expect(screen.getByText('jacques-dupont')).toBeInTheDocument()
    expect(screen.getByTestId('hal-login-button')).toHaveTextContent(
      'halProvided=true',
    )
    expect(screen.getByText('hal_control_remove_button')).toBeInTheDocument()
    expect(screen.queryByTestId('LinkIcon')).not.toBeInTheDocument()
  })

  it('authenticated idHAL: link icon + hal_login pill + Remove, no auth button', () => {
    makeStore([
      { type: PersonIdentifierType.idhals, value: 'jacques-dupont' },
      { type: PersonIdentifierType.hal_login, value: 'jdupont' },
    ])
    renderWithProviders()

    expect(screen.getByTestId('LinkIcon')).toBeInTheDocument()
    expect(screen.getByText('hal_login')).toBeInTheDocument()
    expect(screen.getByText('hal_control_remove_button')).toBeInTheDocument()
    expect(screen.queryByTestId('hal-login-button')).not.toBeInTheDocument()
  })

  it('manual add offers an idHal_s / idHal_i switcher and submits the chosen type', async () => {
    makeStore([])
    renderWithProviders()

    fireEvent.click(screen.getByText('manual_identifier_add_button'))
    // both switcher toggles present
    expect(screen.getByText('idHal_s')).toBeInTheDocument()
    expect(screen.getByText('idHal_i')).toBeInTheDocument()

    // choose idHal_i and submit a numeric value
    fireEvent.click(screen.getByText('idHal_i'))
    fireEvent.change(screen.getByLabelText('idHAL'), {
      target: { value: '1161147' },
    })
    fireEvent.click(screen.getByText('manual_identifier_save_button'))

    await waitFor(() =>
      expect(mockAddPersonIdentifier).toHaveBeenCalledWith(
        'person-uid',
        PersonIdentifierType.idhali,
        '1161147',
      ),
    )
  })

  it('remove authenticated idHAL calls removePersonIdentifier with the stored type', async () => {
    makeStore([
      { type: PersonIdentifierType.idhals, value: 'jacques-dupont' },
      { type: PersonIdentifierType.hal_login, value: 'jdupont' },
    ])
    renderWithProviders()

    fireEvent.click(screen.getByText('hal_control_remove_button'))
    fireEvent.click(screen.getByText('hal_control_remove_dialog_confirm'))

    await waitFor(() =>
      expect(mockRemovePersonIdentifier).toHaveBeenCalledWith(
        'person-uid',
        PersonIdentifierType.idhals,
      ),
    )
  })

  it('no permission: read-only, no action buttons', () => {
    setupSession(null)
    makeStore([{ type: PersonIdentifierType.idhals, value: 'jacques-dupont' }])
    renderWithProviders()

    expect(screen.queryByTestId('hal-login-button')).not.toBeInTheDocument()
    expect(
      screen.queryByText('hal_control_remove_button'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('manual_identifier_add_button'),
    ).not.toBeInTheDocument()
  })
})
