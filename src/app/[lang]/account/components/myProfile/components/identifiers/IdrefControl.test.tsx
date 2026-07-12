import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { useSession } from 'next-auth/react'
import useStore from '@/stores/global_store'
import IdrefControl from './IdrefControl'
import { makeAssignment, makeAuthzContext } from '@/app/auth/context'
import { PermissionAction, PermissionSubject } from '@/types/Permission'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'

jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('next-auth/react', () => ({
  __esModule: true,
  useSession: jest.fn(),
}))

// IdRefInfoBox is mocked to immediately signal readiness so the Save step enables.
jest.mock('./IdRefInfoBox', () => {
  const ReactActual = jest.requireActual('react')
  const MockIdRefInfoBox = ({ onReady }: { onReady?: () => void }) => {
    ReactActual.useEffect(() => {
      onReady?.()
    }, [onReady])
    return null
  }
  return { __esModule: true, default: MockIdRefInfoBox }
})

// <Trans> renders raw message IDs in Jest (empty catalog), so assertions use IDs.
i18n.load('en', {})
i18n.activate('en')

const authzGlobal = makeAuthzContext({
  personUid: 'person-test-uid',
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

const authzSelfScoped = makeAuthzContext({
  personUid: 'person-test-uid',
  roleAssignments: [
    makeAssignment(
      'account_editor',
      [
        {
          action: PermissionAction.update,
          subject: PermissionSubject.Person,
          fields: ['identifiers'],
        },
      ],
      [{ entityType: 'Person', entityUid: 'person-test-uid' }],
    ),
  ],
})

const authzNoPermission = makeAuthzContext({ roleAssignments: [] })

const mockPerson = (idrefValue?: string) => ({
  uid: 'person-test-uid',
  getIdentifiers: () =>
    idrefValue
      ? [new PersonIdentifier(PersonIdentifierType.idref, idrefValue)]
      : [],
  isIdentifierAuthenticated: () => false,
  hasIdentifier: () => false,
  authzProperties: {
    __type: 'Person',
    perimeter: { Person: ['person-test-uid'], ResearchUnit: [] },
  },
})

const mockAddPersonIdentifier = jest.fn()
const mockRemovePersonIdentifier = jest.fn()

const setupStore = (idrefValue?: string, ownPerspective = true) => {
  const person = mockPerson(idrefValue)
  ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
    selector({
      user: {
        connectedUser: { person },
        currentPerspective: person,
        ownPerspective,
        addPersonIdentifier: mockAddPersonIdentifier,
        removePersonIdentifier: mockRemovePersonIdentifier,
      },
    }),
  )
}

const setupSession = (authz: unknown) => {
  ;(useSession as jest.Mock).mockReturnValue({ data: { user: { authz } } })
}

const renderComponent = () =>
  render(
    <I18nProvider i18n={i18n}>
      <IdrefControl />
    </I18nProvider>,
  )

describe('IdrefControl', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAddPersonIdentifier.mockResolvedValue({ success: true })
    mockRemovePersonIdentifier.mockResolvedValue({ success: true })
  })

  it('wide-scoped editor sees an Add button when no IdRef exists', () => {
    setupStore(undefined)
    setupSession(authzGlobal)
    renderComponent()
    expect(screen.getByText('idref_control_add_button')).toBeInTheDocument()
  })

  it('adds via verify → save, calling addPersonIdentifier with the uppercased value', async () => {
    setupStore(undefined)
    setupSession(authzGlobal)
    renderComponent()

    fireEvent.click(screen.getByText('idref_control_add_button'))
    fireEvent.change(screen.getByLabelText('idref_control_input_label'), {
      target: { value: '02345678x' },
    })
    fireEvent.click(screen.getByText('idref_control_verify_button'))
    // Save enables once the (mocked) info box signals readiness
    const save = await screen.findByText('idref_control_confirm_save')
    fireEvent.click(save)

    await waitFor(() =>
      expect(mockAddPersonIdentifier).toHaveBeenCalledWith(
        'person-test-uid',
        PersonIdentifierType.idref,
        '02345678X',
      ),
    )
  })

  it('shows a Remove button when an IdRef exists and removes it', async () => {
    setupStore('026404435')
    setupSession(authzGlobal)
    renderComponent()

    fireEvent.click(screen.getByText('idref_control_remove_button'))
    fireEvent.click(screen.getByText('idref_control_remove_dialog_confirm'))

    await waitFor(() =>
      expect(mockRemovePersonIdentifier).toHaveBeenCalledWith(
        'person-test-uid',
        PersonIdentifierType.idref,
      ),
    )
  })

  it('self-scoped editor on own account can remove but sees no Add', () => {
    setupStore('026404435')
    setupSession(authzSelfScoped)
    renderComponent()
    expect(screen.getByText('idref_control_remove_button')).toBeInTheDocument()
  })

  it('self-scoped editor cannot add an IdRef', () => {
    setupStore(undefined)
    setupSession(authzSelfScoped)
    renderComponent()
    expect(
      screen.queryByText('idref_control_add_button'),
    ).not.toBeInTheDocument()
  })

  it('no permission → read-only, no Add or Remove', () => {
    setupStore(undefined)
    setupSession(authzNoPermission)
    renderComponent()
    expect(
      screen.queryByText('idref_control_add_button'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('idref_control_remove_button'),
    ).not.toBeInTheDocument()
  })
})
