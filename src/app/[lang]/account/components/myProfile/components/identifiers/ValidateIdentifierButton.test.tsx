import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import useStore from '@/stores/global_store'
import ValidateIdentifierButton from './ValidateIdentifierButton'
import { PersonIdentifierType } from '@/types/PersonIdentifier'

jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

// <Trans> renders raw message IDs in Jest (empty catalog), so assertions use IDs.
i18n.load('en', {})
i18n.activate('en')

const mockValidatePersonIdentifier = jest.fn()

const renderButton = (show: boolean) => (
  <I18nProvider i18n={i18n}>
    <ValidateIdentifierButton
      personUid='person-uid'
      type={PersonIdentifierType.idref}
      show={show}
    />
  </I18nProvider>
)

describe('ValidateIdentifierButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        user: { validatePersonIdentifier: mockValidatePersonIdentifier },
      }),
    )
  })

  it('renders nothing actionable when hidden', () => {
    render(renderButton(false))
    expect(
      screen.queryByText('identifier_validate_button'),
    ).not.toBeInTheDocument()
  })

  it('keeps showing the success message once the button is hidden', async () => {
    // The store refresh hides the button before the action resolves
    let resolveValidation: (value: { success: boolean }) => void = () => {}
    mockValidatePersonIdentifier.mockReturnValue(
      new Promise((resolve) => {
        resolveValidation = resolve
      }),
    )
    const { rerender } = render(renderButton(true))

    fireEvent.click(screen.getByText('identifier_validate_button'))
    fireEvent.click(screen.getByText('identifier_validate_dialog_confirm'))
    expect(mockValidatePersonIdentifier).toHaveBeenCalledWith(
      'person-uid',
      PersonIdentifierType.idref,
    )

    rerender(renderButton(false))
    await act(async () => resolveValidation({ success: true }))

    expect(
      screen.queryByText('identifier_validate_button'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('identifier_validate_success')).toBeInTheDocument()
  })

  it('keeps the success message while the snackbar closes', async () => {
    mockValidatePersonIdentifier.mockResolvedValue({ success: true })
    render(renderButton(true))

    fireEvent.click(screen.getByText('identifier_validate_button'))
    fireEvent.click(screen.getByText('identifier_validate_dialog_confirm'))
    await screen.findByText('identifier_validate_success')

    // Closing starts the exit transition: the content must not switch to the error
    fireEvent.click(screen.getByLabelText('Close'))

    expect(
      screen.queryByText('identifier_validate_failure'),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('alert', { hidden: true })).toHaveClass(
      'MuiAlert-standardSuccess',
    )
  })

  it('shows the failure message when validation fails', async () => {
    mockValidatePersonIdentifier.mockResolvedValue({ success: false })
    render(renderButton(true))

    fireEvent.click(screen.getByText('identifier_validate_button'))
    fireEvent.click(screen.getByText('identifier_validate_dialog_confirm'))

    expect(
      await screen.findByText('identifier_validate_failure'),
    ).toBeInTheDocument()
  })
})
