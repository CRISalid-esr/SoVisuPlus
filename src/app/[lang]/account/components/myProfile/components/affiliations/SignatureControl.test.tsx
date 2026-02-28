import useStore from '@/stores/global_store'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import SignatureControl from '@/app/[lang]/account/components/myProfile/components/affiliations/SignatureControl'

jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockState = {
  user: {
    connectedUser: {
      id: '1',
      person: {
        uid: 'local-jdoe',
        external: false,
        displayName: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        memberships: [
          {
            id: 1,
            personId: 1,
            researchStructureId: 1,
            startDate: null,
            endDate: null,
            positionCode: null,
            researchStructure: {
              id: 1,
              uid: '12345',
              acronym: 'ABC',
              signature: 'ABC_Signature',
              external: false,
              slug: 'research-structure:abc',
            },
          },
          {
            id: 2,
            personId: 1,
            researchStructureId: 2,
            startDate: null,
            endDate: null,
            positionCode: null,
            researchStructure: {
              id: 2,
              uid: '67890',
              acronym: 'DEF',
              signature: 'DEF_Signature',
              external: false,
              slug: 'research-structure:def',
            },
          },
        ],
        membershipSignatures: ['ABC_Signature', 'DEF_Signature'],
      },
      type: 'person',
      slug: 'person:john-doe',
    },
  },
}

beforeEach(() => {
  ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
    selector(mockState),
  )

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
  it('displays signatures', async () => {
    render(
      <I18nProvider i18n={i18n}>
        <SignatureControl />
      </I18nProvider>,
    )
    expect(
      screen.getByText(i18n.t('profile_affiliations_signature_label')),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        mockState.user.connectedUser.person.membershipSignatures.join(),
      ),
    ).toBeInTheDocument()
  })

  it('signature copy button works', async () => {
    render(
      <I18nProvider i18n={i18n}>
        <SignatureControl />
      </I18nProvider>,
    )
    const copyButton = screen.getByRole('button')
    fireEvent.click(copyButton)
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled()
      expect(
        screen.getByText(
          i18n.t('profile_affiliations_signature_copied_message_confirmation'),
        ),
      ).toBeInTheDocument()
    })
  })

  it('signature copy button disabled if no signature', async () => {
    const mockStateWithNoSignature = {
      user: {
        connectedUser: {
          id: '1',
          person: {
            uid: 'local-jdoe',
            external: false,
            displayName: 'John Doe',
            firstName: 'John',
            lastName: 'Doe',
            memberships: [
              {
                id: 1,
                personId: 1,
                researchStructureId: 1,
                startDate: null,
                endDate: null,
                positionCode: null,
                researchStructure: {
                  id: 1,
                  uid: '12345',
                  acronym: 'ABC',
                  signature: '',
                  external: false,
                  slug: 'research-structure:abc',
                },
              },
              {
                id: 2,
                personId: 1,
                researchStructureId: 2,
                startDate: null,
                endDate: null,
                positionCode: null,
                researchStructure: {
                  id: 2,
                  uid: '67890',
                  acronym: 'DEF',
                  signature: '',
                  external: false,
                  slug: 'research-structure:def',
                },
              },
            ],
            membershipSignatures: [],
          },
          type: 'person',
          slug: 'person:john-doe',
        },
      },
    }
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockStateWithNoSignature),
    )
    render(
      <I18nProvider i18n={i18n}>
        <SignatureControl />
      </I18nProvider>,
    )
    const copyButton = screen.getByRole('button')
    expect(copyButton).toBeDisabled()
  })
})
