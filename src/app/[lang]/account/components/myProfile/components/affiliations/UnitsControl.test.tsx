import useStore from '@/stores/global_store'
import { act, render, screen } from '@testing-library/react'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import UnitsControl from '@/app/[lang]/account/components/myProfile/components/affiliations/UnitsControl'

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
            researchUnitId: 1,
            startDate: null,
            endDate: null,
            positionCode: null,
            researchUnit: {
              id: 1,
              uid: '12345',
              acronym: 'ABC',
              signature: 'ABC_Signature',
              external: false,
              slug: 'research-unit:abc',
            },
          },
          {
            id: 2,
            personId: 1,
            researchUnitId: 2,
            startDate: null,
            endDate: null,
            positionCode: null,
            researchUnit: {
              id: 2,
              uid: '67890',
              acronym: 'DEF',
              signature: 'DEF_Signature',
              external: false,
              slug: 'research-unit:def',
            },
          },
        ],
        membershipAcronyms: ['ABC', 'DEF'],
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

describe('UnitsControl Component', () => {
  it('displays memberships acronym', async () => {
    render(
      <I18nProvider i18n={i18n}>
        <UnitsControl />
      </I18nProvider>,
    )
    expect(
      screen.getByText(i18n.t('profile_affiliations_units_label')),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        mockState.user.connectedUser.person.membershipAcronyms.join(),
      ),
    ).toBeInTheDocument()
  })

  it('displays message if no membership', async () => {
    const mockStateWithoutUnits = {
      ...mockState,
      user: {
        ...mockState.user,
        connectedUser: {
          ...mockState.user.connectedUser,
          person: {
            ...mockState.user.connectedUser.person,
            memberships: [],
            membershipAcronyms: [],
          },
        },
      },
    }

    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockStateWithoutUnits),
    )

    render(
      <I18nProvider i18n={i18n}>
        <UnitsControl />
      </I18nProvider>,
    )
    expect(
      screen.getByText(i18n.t('profile_affiliations_no_units')),
    ).toBeInTheDocument()
  })
})
