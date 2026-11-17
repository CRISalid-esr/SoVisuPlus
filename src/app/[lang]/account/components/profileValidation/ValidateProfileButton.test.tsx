import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import useStore from '@/stores/global_store'
import ValidateProfileButton from './ValidateProfileButton'

jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

// <Trans> renders raw message IDs in Jest (empty catalog), so assertions use IDs.
i18n.load('en', {})
i18n.activate('en')

const mockValidatePersonProfile = jest.fn()

const renderButton = (show: boolean) => (
  <I18nProvider i18n={i18n}>
    <ValidateProfileButton personUid='person-uid' show={show} />
  </I18nProvider>
)

describe('ValidateProfileButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ user: { validatePersonProfile: mockValidatePersonProfile } }),
    )
  })

  it('renders nothing actionable when hidden', () => {
    render(renderButton(false))
    expect(
      screen.queryByText('profile_validate_button'),
    ).not.toBeInTheDocument()
  })

  it('does not validate when the confirmation is cancelled', () => {
    render(renderButton(true))

    fireEvent.click(screen.getByText('profile_validate_button'))
    fireEvent.click(screen.getByText('identifier_dialog_cancel_button'))

    expect(mockValidatePersonProfile).not.toHaveBeenCalled()
  })

  it('keeps showing the success message once the button is hidden', async () => {
    // The store refresh hides the button before the action resolves
    let resolveValidation: (value: { success: boolean }) => void = () => {}
    mockValidatePersonProfile.mockReturnValue(
      new Promise((resolve) => {
        resolveValidation = resolve
      }),
    )
    const { rerender } = render(renderButton(true))

    fireEvent.click(screen.getByText('profile_validate_button'))
    fireEvent.click(screen.getByText('profile_validate_dialog_confirm'))
    expect(mockValidatePersonProfile).toHaveBeenCalledWith('person-uid')

    rerender(renderButton(false))
    await act(async () => resolveValidation({ success: true }))

    expect(
      screen.queryByText('profile_validate_button'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('profile_validate_success')).toBeInTheDocument()
  })

  it('shows the failure message when validation fails', async () => {
    mockValidatePersonProfile.mockResolvedValue({ success: false })
    render(renderButton(true))

    fireEvent.click(screen.getByText('profile_validate_button'))
    fireEvent.click(screen.getByText('profile_validate_dialog_confirm'))

    expect(
      await screen.findByText('profile_validate_failure'),
    ).toBeInTheDocument()
  })
})
