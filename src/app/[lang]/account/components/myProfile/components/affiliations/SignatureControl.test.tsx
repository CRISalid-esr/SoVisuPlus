import useStore from '@/stores/global_store'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import SignatureControl from '@/app/[lang]/account/components/myProfile/components/affiliations/SignatureControl'

jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const connectedPerson = {
  uid: 'local-jdoe',
  type: 'person',
  membershipSignatures: ['ABC_Signature', 'DEF_Signature'],
}

const mockStore = (currentPerspective: object | null) =>
  (useStore as unknown as jest.Mock).mockImplementation((selector) =>
    selector({
      user: {
        connectedUser: { id: '1', person: connectedPerson },
        currentPerspective,
      },
    }),
  )

const renderSignatureControl = () =>
  render(
    <I18nProvider i18n={i18n}>
      <SignatureControl />
    </I18nProvider>,
  )

beforeEach(() => {
  mockStore(connectedPerson)

  Object.assign(navigator, {
    clipboard: {
      writeText: jest.fn().mockResolvedValue(undefined),
    },
  })

  act(() => {
    i18n.activate('en')
  })
  jest.clearAllMocks()
})

describe('SignatureControl Component', () => {
  it('displays signatures', () => {
    renderSignatureControl()
    expect(
      screen.getByText(i18n.t('profile_affiliations_signature_label')),
    ).toBeInTheDocument()
    expect(screen.getByText('ABC_Signature,DEF_Signature')).toBeInTheDocument()
  })

  it("displays the perspective person's signatures when viewing another account", () => {
    mockStore({
      uid: 'local-asmith',
      type: 'person',
      membershipSignatures: ['XYZ_Signature'],
    })
    renderSignatureControl()
    expect(screen.getByText('XYZ_Signature')).toBeInTheDocument()
    expect(
      screen.queryByText('ABC_Signature,DEF_Signature'),
    ).not.toBeInTheDocument()
  })

  it('signature copy button works', async () => {
    renderSignatureControl()
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled()
      expect(
        screen.getByText(
          i18n.t('profile_affiliations_signature_copied_message_confirmation'),
        ),
      ).toBeInTheDocument()
    })
  })

  it("shows no signature when the perspective person has none, never the connected user's", () => {
    mockStore({ uid: 'local-asmith', type: 'person', membershipSignatures: [] })
    renderSignatureControl()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('profile_affiliations_no_signature_message')),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('ABC_Signature,DEF_Signature'),
    ).not.toBeInTheDocument()
  })

  it('shows no signature when the perspective is not a person', () => {
    mockStore(null)
    renderSignatureControl()
    expect(
      screen.getByText(i18n.t('profile_affiliations_no_signature_message')),
    ).toBeInTheDocument()
  })
})
