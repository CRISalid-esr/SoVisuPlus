import React from 'react'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  within,
} from '@testing-library/react'
import '@testing-library/jest-dom'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { useSession } from 'next-auth/react'
import useStore from '@/stores/global_store'
import IdrefControl from './IdrefControl'
import IdRefInfoBox from './IdRefInfoBox'
import { makeAssignment, makeAuthzContext } from '@/app/auth/context'
import { PermissionAction, PermissionSubject } from '@/types/Permission'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('next-auth/react', () => ({
  __esModule: true,
  useSession: jest.fn(),
}))

jest.mock('./IdRefInfoBox', () => ({
  __esModule: true,
  default: jest.fn(),
}))

// ── i18n ──────────────────────────────────────────────────────────────────────
// Note: <Trans>key</Trans> from @lingui/react/macro renders the raw message ID
// in the Jest environment (the hash-based catalog lookup fails). All DOM
// assertions therefore use message IDs, not translated strings.

i18n.load('en', {})
i18n.activate('en')

// ── Authz contexts ─────────────────────────────────────────────────────────────

const authzWithPermission = makeAuthzContext({
  roleAssignments: [
    makeAssignment('library_staff', [
      {
        action: PermissionAction.update,
        subject: PermissionSubject.Person,
        fields: ['identifiers'],
      },
    ]),
  ],
})

const authzNoPermission = makeAuthzContext({ roleAssignments: [] })

// ── Person factory ─────────────────────────────────────────────────────────────

const mockPerson = (idrefValue?: string) => ({
  uid: 'person-test-uid',
  getIdentifiers: () =>
    idrefValue
      ? [new PersonIdentifier(PersonIdentifierType.idref, idrefValue)]
      : [],
  authzProperties: {
    __type: 'Person',
    perimeter: { Person: ['person-test-uid'], ResearchUnit: [] },
  },
})

// ── Store / session helpers ────────────────────────────────────────────────────

const mockUpdatePersonIdentifier = jest.fn()
const mockRemovePersonIdentifier = jest.fn()

const setupStore = (idrefValue?: string) => {
  ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
    selector({
      user: {
        connectedUser: { person: mockPerson(idrefValue) },
        updatePersonIdentifier: mockUpdatePersonIdentifier,
        removePersonIdentifier: mockRemovePersonIdentifier,
      },
    }),
  )
}

const setupSession = (withPermission: boolean) => {
  ;(useSession as jest.Mock).mockReturnValue({
    data: {
      user: { authz: withPermission ? authzWithPermission : authzNoPermission },
    },
  })
}

// ── Render wrapper ─────────────────────────────────────────────────────────────

const renderComponent = () =>
  render(
    <I18nProvider i18n={i18n}>
      <IdrefControl />
    </I18nProvider>,
  )

// ── IdRefInfoBox stub ──────────────────────────────────────────────────────────
// Captures the onReady callback so tests can fire it manually with act().

let capturedOnReady: (() => void) | undefined

const MockedIdRefInfoBox = IdRefInfoBox as jest.MockedFunction<
  typeof IdRefInfoBox
>

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('IdrefControl', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    capturedOnReady = undefined

    MockedIdRefInfoBox.mockImplementation(({ onReady, forceOpen, idrefId }) => {
      capturedOnReady = onReady
      return (
        <div
          data-testid='idref-info-box'
          data-force-open={String(forceOpen ?? false)}
          data-idref-id={idrefId}
        />
      )
    })
  })

  // ── View mode ────────────────────────────────────────────────────────────────

  describe('view mode', () => {
    it('shows the not-available message ID when no idref is set', () => {
      setupStore()
      setupSession(true)
      renderComponent()

      expect(
        screen.getByText('idref_control_not_available'),
      ).toBeInTheDocument()
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
    })

    it('shows a link to idref.fr when an idref is set', () => {
      setupStore('127220747')
      setupSession(true)
      renderComponent()

      const link = screen.getByRole('link')
      expect(link).toHaveTextContent('127220747')
      expect(link).toHaveAttribute('href', 'https://www.idref.fr/127220747')
    })

    it('renders IdRefInfoBox (collapsed) when an idref is set', () => {
      setupStore('127220747')
      setupSession(true)
      renderComponent()

      const box = screen.getByTestId('idref-info-box')
      expect(box).toHaveAttribute('data-force-open', 'false')
      expect(box).toHaveAttribute('data-idref-id', '127220747')
    })

    it('does not render IdRefInfoBox when no idref is set', () => {
      setupStore()
      setupSession(true)
      renderComponent()

      expect(screen.queryByTestId('idref-info-box')).not.toBeInTheDocument()
    })

    it('disables the Edit button when the user has no permission', () => {
      setupStore()
      setupSession(false)
      renderComponent()

      // Button text is message ID "idref_control_edit_button" which contains "edit"
      expect(screen.getByRole('button', { name: /edit/i })).toBeDisabled()
    })

    it('enables the Edit button when the user has permission', () => {
      setupStore()
      setupSession(true)
      renderComponent()

      expect(screen.getByRole('button', { name: /edit/i })).toBeEnabled()
    })
  })

  // ── Edit mode ────────────────────────────────────────────────────────────────

  describe('edit mode', () => {
    beforeEach(() => {
      setupStore()
      setupSession(true)
    })

    it('shows the text field after clicking Edit', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /edit/i }))

      // Label text is "idref_control_input_label" — query by role alone
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('returns to view mode when Cancel is clicked', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /edit/i }))
      // "edit_field_cancel_button_label" contains "cancel"
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(
        screen.getByText('idref_control_not_available'),
      ).toBeInTheDocument()
    })

    it('shows a validation error when Verify is clicked with an invalid format', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /edit/i }))
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'bad-value' },
      })
      // "idref_control_verify_button" contains "verify"
      fireEvent.click(screen.getByRole('button', { name: /verify/i }))

      // Validation error message ID is "idref_control_invalid_format"
      expect(
        screen.getByText('idref_control_invalid_format'),
      ).toBeInTheDocument()
      expect(mockUpdatePersonIdentifier).not.toHaveBeenCalled()
    })
  })

  // ── Verify → Confirm flow ────────────────────────────────────────────────────

  describe('verify → confirm flow', () => {
    beforeEach(() => {
      setupStore()
      setupSession(true)
    })

    const enterEditAndVerify = (value = '127220747') => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /edit/i }))
      fireEvent.change(screen.getByRole('textbox'), { target: { value } })
      fireEvent.click(screen.getByRole('button', { name: /verify/i }))
    }

    it('shows IdRefInfoBox in forced mode after clicking Verify', () => {
      enterEditAndVerify()

      const box = screen.getByTestId('idref-info-box')
      expect(box).toHaveAttribute('data-force-open', 'true')
      expect(box).toHaveAttribute('data-idref-id', '127220747')
    })

    it('disables the text field while in verify mode', () => {
      enterEditAndVerify()

      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('keeps the Confirm button disabled until onReady is called', () => {
      enterEditAndVerify()

      // "idref_control_confirm_save" contains "confirm"
      expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled()
    })

    it('enables the Confirm button once onReady fires', () => {
      enterEditAndVerify()

      act(() => {
        capturedOnReady?.()
      })

      expect(screen.getByRole('button', { name: /confirm/i })).toBeEnabled()
    })

    it('calls updatePersonIdentifier with the uppercased value on Confirm', async () => {
      mockUpdatePersonIdentifier.mockResolvedValue({ success: true })

      enterEditAndVerify('127220747')
      act(() => {
        capturedOnReady?.()
      })
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

      await waitFor(() => {
        expect(mockUpdatePersonIdentifier).toHaveBeenCalledWith(
          'person-test-uid',
          PersonIdentifierType.idref,
          '127220747',
        )
      })
    })

    it('returns to view mode after a successful save', async () => {
      mockUpdatePersonIdentifier.mockResolvedValue({ success: true })

      enterEditAndVerify()
      act(() => {
        capturedOnReady?.()
      })
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      })
    })

    it('shows an error snackbar on a failed save', async () => {
      mockUpdatePersonIdentifier.mockResolvedValue({ success: false })

      enterEditAndVerify()
      act(() => {
        capturedOnReady?.()
      })
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

      await waitFor(() => {
        // Snackbar text is message ID "idref_control_update_failure"
        expect(
          screen.getByText('idref_control_update_failure'),
        ).toBeInTheDocument()
      })
    })

    it('resets verify mode when the input is changed mid-flow', () => {
      enterEditAndVerify()

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '999999999' },
      })

      // Verify button reappears, Confirm button is gone
      expect(
        screen.getByRole('button', { name: /verify/i }),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /confirm/i }),
      ).not.toBeInTheDocument()
    })
  })

  // ── Remove flow ──────────────────────────────────────────────────────────────

  describe('remove flow', () => {
    beforeEach(() => {
      setupStore('127220747')
      setupSession(true)
      mockRemovePersonIdentifier.mockResolvedValue({ success: true })
    })

    const openEditMode = () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /edit/i }))
    }

    it('shows the Remove button in edit mode when an idref is set', () => {
      openEditMode()
      // "idref_control_remove_button" contains "remove"
      expect(
        screen.getByRole('button', { name: /idref_control_remove_button/i }),
      ).toBeInTheDocument()
    })

    it('opens the confirmation dialog when Remove is clicked', () => {
      openEditMode()
      fireEvent.click(
        screen.getByRole('button', { name: /idref_control_remove_button/i }),
      )

      const dialog = screen.getByRole('dialog')
      expect(
        within(dialog).getByText('idref_control_remove_dialog_title'),
      ).toBeInTheDocument()
      expect(
        within(dialog).getByText('idref_control_remove_dialog_text'),
      ).toBeInTheDocument()
    })

    it('calls removePersonIdentifier when the dialog is confirmed', async () => {
      openEditMode()
      fireEvent.click(
        screen.getByRole('button', { name: /idref_control_remove_button/i }),
      )

      const dialog = screen.getByRole('dialog')
      fireEvent.click(
        within(dialog).getByText('idref_control_remove_dialog_confirm'),
      )

      await waitFor(() => {
        expect(mockRemovePersonIdentifier).toHaveBeenCalledWith(
          'person-test-uid',
          PersonIdentifierType.idref,
        )
      })
    })

    it('does not call removePersonIdentifier when dialog Cancel is clicked', () => {
      openEditMode()
      fireEvent.click(
        screen.getByRole('button', { name: /idref_control_remove_button/i }),
      )

      const dialog = screen.getByRole('dialog')
      // Use within() to scope to the dialog and avoid the edit-mode Cancel button
      fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }))

      // MUI Dialog stays in the DOM until its CSS transition completes (which
      // doesn't happen in JSDOM). Assert on observable behaviour instead.
      expect(mockRemovePersonIdentifier).not.toHaveBeenCalled()
    })

    it('shows a success snackbar after removal', async () => {
      openEditMode()
      fireEvent.click(
        screen.getByRole('button', { name: /idref_control_remove_button/i }),
      )

      const dialog = screen.getByRole('dialog')
      fireEvent.click(
        within(dialog).getByText('idref_control_remove_dialog_confirm'),
      )

      await waitFor(() => {
        // Snackbar text is message ID "idref_control_remove_success"
        expect(
          screen.getByText('idref_control_remove_success'),
        ).toBeInTheDocument()
      })
    })
  })
})
