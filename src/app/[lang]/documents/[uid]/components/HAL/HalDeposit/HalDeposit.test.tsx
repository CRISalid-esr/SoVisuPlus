import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { ThemeProvider } from '@mui/material/styles'
import { lightTheme } from '@/app/theme/theme'
import { DocumentState } from '@prisma/client'
import { messages } from '@/locales/en/messages'
import useStore from '@/stores/global_store'
import { DocumentType, Document as DocumentClass } from '@/types/Document'
import { Literal } from '@/types/Literal'
import { Contribution } from '@/types/Contribution'
import { AuthorityOrganization } from '@/types/AuthorityOrganization'
import { AuthorityOrganizationIdentifier } from '@/types/AuthorityOrganizationIdentifier'
import { Person } from '@/types/Person'
import { PersonIdentifier } from '@/types/PersonIdentifier'
import HalDeposit from './HalDeposit'

jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: null }) }))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useParams: () => ({ lang: 'en', uid: 'doc' }),
}))
const mockCan = jest.fn()
jest.mock('@/app/auth/ability', () => ({
  abilityFromAuthzContext: () => ({
    can: (...args: unknown[]) => mockCan(...args),
  }),
}))

const createDeposit = jest.fn()

const withIdentifiers = (types: string[]) =>
  new Person(
    'p',
    false,
    null,
    'A B',
    'A',
    'B',
    types.map((type) => new PersonIdentifier(type as never, `v-${type}`)),
  )

/** Holds both HAL identifiers, so every gate is open and the form is what renders. */
const person = withIdentifiers(['idhals', 'hal_login'])

/** Swapped in per test; defaults to the fully-identified person. */
let perspectivePerson: Person = person

const org = new AuthorityOrganization(
  'org',
  ['Lab'],
  null,
  [],
  [new AuthorityOrganizationIdentifier('ror' as never, 'val')],
)

const document = new DocumentClass(
  'doc',
  DocumentType.Article,
  null,
  '2024',
  null,
  null,
  null,
  [new Literal('A title', 'en')],
  [],
  [],
  [new Contribution(person, [], [org], 1)],
  [],
  DocumentState.default,
  { title: 'A journal' } as never,
)

const renderDeposit = () =>
  render(
    <I18nProvider i18n={i18n}>
      <ThemeProvider theme={lightTheme}>
        <HalDeposit />
      </ThemeProvider>
    </I18nProvider>,
  )

/**
 * Fills the one required field with no default (HAL domains) and opens the review step. The code
 * is typed first: the unfiltered list is ~500 options, which jsdom is too slow to render.
 */
const goToReview = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/HAL domains/i), 'chim')
  await user.click(screen.getAllByRole('option')[0])
  await user.click(screen.getByRole('button', { name: 'Review' }))
}

beforeAll(() => {
  i18n.load('en', messages)
  i18n.activate('en')
})

// Rendering the form drives a ~500-option Autocomplete, which is slow in jsdom; the default 5s
// is enough in isolation but not under full-suite parallel load.
jest.setTimeout(30000)

beforeEach(() => {
  jest.clearAllMocks()
  perspectivePerson = person
  // Permissive by default; the gate tests below narrow it.
  mockCan.mockReturnValue(true)
  ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
    selector({
      document: { selectedDocument: document },
      user: { currentPerspective: perspectivePerson, ownPerspective: true },
      halDeposit: {
        byDocument: { doc: null },
        loading: {},
        fetchLatestDeposit: jest.fn(),
        createDeposit,
      },
    }),
  )
})

describe('HalDeposit submit failure', () => {
  /**
   * Regression: the failure handler sets the error *and* returns to the form step, so an Alert
   * rendered only under `step === 'review'` unmounted in the very render that would have shown
   * it — every deposit failure was silent.
   */
  it('shows the failure message after a rejected submit', async () => {
    const user = userEvent.setup({ delay: null })
    createDeposit.mockResolvedValue({
      success: false,
      error: 'A main file is required',
      reason: 'missing_main_file',
    })
    renderDeposit()

    await goToReview(user)
    await user.click(screen.getByRole('button', { name: /Confirm deposit/i }))

    await waitFor(() =>
      expect(screen.getByText(/requires a main file/i)).toBeInTheDocument(),
    )
  })

  it('translates the reason rather than echoing the route English', async () => {
    const user = userEvent.setup({ delay: null })
    createDeposit.mockResolvedValue({
      success: false,
      error: 'Not allowed to deposit on behalf of this person',
      reason: 'forbidden',
    })
    renderDeposit()

    await goToReview(user)
    await user.click(screen.getByRole('button', { name: /Confirm deposit/i }))

    await waitFor(() =>
      expect(
        screen.getByText(/You are not allowed to deposit on behalf/i),
      ).toBeInTheDocument(),
    )
    expect(
      screen.queryByText('Not allowed to deposit on behalf of this person'),
    ).toBeNull()
  })

  it('falls back to the generic message when the response carries no reason', async () => {
    const user = userEvent.setup({ delay: null })
    createDeposit.mockResolvedValue({ success: false, error: 'Deposit failed' })
    renderDeposit()

    await goToReview(user)
    await user.click(screen.getByRole('button', { name: /Confirm deposit/i }))

    await waitFor(() =>
      expect(screen.getByText(/could not be sent/i)).toBeInTheDocument(),
    )
    expect(screen.queryByText('Deposit failed')).toBeNull()
  })
})

describe('HalDeposit HAL identifier gates', () => {
  /**
   * The two legs used to share one message ("A HAL login *or* identifier is necessary"), so a
   * person who held an idHAL but no hal_login was told an idHAL was missing.
   */
  beforeEach(() => {
    // Without `deposit_hal_unauthenticated` the hal_login leg is enforced.
    mockCan.mockImplementation(
      (action: string) => action !== 'deposit_hal_unauthenticated',
    )
  })

  it('names the idHAL when that is what is missing', () => {
    perspectivePerson = withIdentifiers(['hal_login'])
    renderDeposit()

    expect(screen.getByText(/A HAL identifier \(idHAL\)/i)).toBeInTheDocument()
    expect(screen.queryByText(/A HAL login is necessary/i)).toBeNull()
  })

  it('names the HAL login when the idHAL is present but the login is not', () => {
    perspectivePerson = withIdentifiers(['idhals'])
    renderDeposit()

    expect(screen.getByText(/A HAL login is necessary/i)).toBeInTheDocument()
    expect(screen.queryByText(/A HAL identifier \(idHAL\)/i)).toBeNull()
  })

  it('waives the login leg for deposit_hal_unauthenticated', () => {
    mockCan.mockReturnValue(true)
    perspectivePerson = withIdentifiers(['idhals'])
    renderDeposit()

    expect(screen.queryByText(/A HAL login is necessary/i)).toBeNull()
    expect(screen.getByLabelText(/HAL domains/i)).toBeInTheDocument()
  })
})
