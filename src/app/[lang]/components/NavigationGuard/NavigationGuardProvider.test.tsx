import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  GuardedLink,
  NavigationGuardProvider,
  useBlockNavigation,
  useGuardedRouter,
} from './NavigationGuardProvider'

const pushMock = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: jest.fn(), back: jest.fn() }),
  usePathname: () => '/fr/documents/doc-1',
  useSearchParams: () => new URLSearchParams(),
}))

function Harness({ blocked }: { blocked: boolean }) {
  useBlockNavigation(blocked)
  const router = useGuardedRouter()
  return (
    <>
      <button onClick={() => router.push('/fr/dashboard')}>go</button>
      <GuardedLink href='/fr/expertise'>link</GuardedLink>
    </>
  )
}

const renderHarness = (blocked: boolean) =>
  render(
    <NavigationGuardProvider>
      <Harness blocked={blocked} />
    </NavigationGuardProvider>,
  )

// Within the guard modal, the actions are rendered as [Stay, Leave].
const modalButtons = () =>
  within(screen.getByRole('dialog')).getAllByRole('button')

describe('NavigationGuardProvider', () => {
  beforeEach(() => jest.clearAllMocks())

  it('navigates immediately when nothing is blocking', async () => {
    renderHarness(false)
    await userEvent.click(screen.getByText('go'))

    expect(pushMock).toHaveBeenCalledWith('/fr/dashboard', undefined)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('defers a programmatic push behind the modal and runs it on confirm', async () => {
    renderHarness(true)
    await userEvent.click(screen.getByText('go'))

    expect(pushMock).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await userEvent.click(modalButtons()[1]) // Leave
    expect(pushMock).toHaveBeenCalledWith('/fr/dashboard', undefined)
  })

  it('drops the navigation when the user chooses to stay', async () => {
    renderHarness(true)
    await userEvent.click(screen.getByText('go'))
    await userEvent.click(modalButtons()[0]) // Stay

    expect(pushMock).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  })

  it('guards GuardedLink clicks while blocked', async () => {
    renderHarness(true)
    await userEvent.click(screen.getByText('link'))

    expect(pushMock).not.toHaveBeenCalled()
    await userEvent.click(modalButtons()[1]) // Leave
    expect(pushMock).toHaveBeenCalledWith('/fr/expertise')
  })

  it('lets GuardedLink clicks through when not blocked', async () => {
    renderHarness(false)
    await userEvent.click(screen.getByText('link'))

    expect(pushMock).toHaveBeenCalledWith('/fr/expertise')
  })
})
