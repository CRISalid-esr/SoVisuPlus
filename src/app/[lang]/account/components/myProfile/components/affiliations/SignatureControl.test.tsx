import useStore from '@/stores/global_store'
import { act, render, screen } from '@testing-library/react'
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

  act(() => {
    i18n.activate('en')
  })
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
})
