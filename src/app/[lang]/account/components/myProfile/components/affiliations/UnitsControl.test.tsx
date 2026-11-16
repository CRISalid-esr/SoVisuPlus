import useStore from '@/stores/global_store'
import { act, render, screen } from '@testing-library/react'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import UnitsControl from '@/app/[lang]/account/components/myProfile/components/affiliations/UnitsControl'

jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const connectedPerson = {
  uid: 'local-jdoe',
  type: 'person',
  membershipAcronyms: ['ABC', 'DEF'],
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

const renderUnitsControl = () =>
  render(
    <I18nProvider i18n={i18n}>
      <UnitsControl />
    </I18nProvider>,
  )

beforeEach(() => {
  mockStore(connectedPerson)

  act(() => {
    i18n.activate('en')
  })
})

describe('UnitsControl Component', () => {
  it('displays memberships acronym', () => {
    renderUnitsControl()
    expect(
      screen.getByText(i18n.t('profile_affiliations_units_label')),
    ).toBeInTheDocument()
    expect(screen.getByText('ABC,DEF')).toBeInTheDocument()
  })

  it("displays the perspective person's memberships when viewing another account", () => {
    mockStore({
      uid: 'local-asmith',
      type: 'person',
      membershipAcronyms: ['XYZ'],
    })
    renderUnitsControl()
    expect(screen.getByText('XYZ')).toBeInTheDocument()
    expect(screen.queryByText('ABC,DEF')).not.toBeInTheDocument()
  })

  it("displays message if no membership, never the connected user's", () => {
    mockStore({ uid: 'local-asmith', type: 'person', membershipAcronyms: [] })
    renderUnitsControl()
    expect(
      screen.getByText(i18n.t('profile_affiliations_no_units')),
    ).toBeInTheDocument()
    expect(screen.queryByText('ABC,DEF')).not.toBeInTheDocument()
  })

  it('displays message if the perspective is not a person', () => {
    mockStore(null)
    renderUnitsControl()
    expect(
      screen.getByText(i18n.t('profile_affiliations_no_units')),
    ).toBeInTheDocument()
  })
})
