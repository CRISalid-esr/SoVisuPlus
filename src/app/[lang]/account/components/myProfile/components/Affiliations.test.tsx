import { act, render, screen } from '@testing-library/react'
import { i18n } from '@lingui/core'
import { createTheme, ThemeOptions, ThemeProvider } from '@mui/material/styles'
import { I18nProvider } from '@lingui/react'
import Affiliations from '@/app/[lang]/account/components/myProfile/components/Affiliations'
import useStore from '@/stores/global_store'

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

const theme = createTheme({
  typography: {
    fontWeightRegular: 400,
    lineHeight: { lineHeight24px: '24px' },
  },
  palette: {
    white: '#ffffff',
    primary: { main: '#1976d2' },
    background: { paper: '#ffffff' },
  },
  utils: {
    pxToRem: (value: number) => `${value / 16}rem`,
  },
} as ThemeOptions)

describe('Affiliations Component', () => {
  it('displays affiliation title', async () => {
    render(
      <ThemeProvider theme={theme}>
        <I18nProvider i18n={i18n}>
          <Affiliations />
        </I18nProvider>
      </ThemeProvider>,
    )

    expect(
      screen.getByText(i18n.t('profile_affiliations_card_title')),
    ).toBeInTheDocument()
  })
})
