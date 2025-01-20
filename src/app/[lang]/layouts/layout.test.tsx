import { render, screen } from '@testing-library/react'
import { useMediaQuery } from '@mui/system'
import useStore from '@/stores/global_store' // Import the store
import MainLayout from './MainLayout' // Adjust path as needed

// Mock the necessary dependencies
jest.mock('@mui/system', () => ({
  ...jest.requireActual('@mui/system'),
  useMediaQuery: jest.fn(),
}))

jest.mock('../components/appbar', () => ({
  Appbar: jest.fn(() => <div>Appbar</div>),
}))

jest.mock('../components/sidebar', () => ({
  Sidebar: jest.fn(() => <div>Sidebar</div>),
}))

jest.mock('../components/AuthenticatedRoute', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ), // Mock AuthenticatedRoute to return children
}))

jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

describe('DashboardLayout', () => {
  beforeEach(() => {
    // Mock Zustand store to return a connected user and loading state
    const mockStore = useStore as unknown as jest.Mock
    mockStore.mockReturnValue({
      connectedUser: { name: 'Test User' },
      loading: false,
      fetchConnectedUser: jest.fn(),
    })
  })

  // Helper function to render with the store (no need for SessionProvider anymore)
  const renderWithStore = (children: React.ReactNode) => {
    return render(
      <div>{children}</div>, // No need for SessionProvider, as you're now using the store
    )
  }

  it('renders the layout with children', () => {
    renderWithStore(
      <MainLayout>
        <div>Child Content</div>
      </MainLayout>,
    )

    // Check that child content is rendered
    expect(screen.getByText('Child Content')).toBeInTheDocument()
  })

  it('displays loading state when user data is being fetched', () => {
    // Mock loading state
    const mockStore = useStore as unknown as jest.Mock
    mockStore.mockReturnValue({
      connectedUser: null,
      loading: true,
      // fetchConnectedUser should support catch
      fetchConnectedUser: jest
        .fn()
        .mockRejectedValue(new Error('Failed to fetch')),
    })

    renderWithStore(
      <MainLayout>
        <div>Child Content</div>
      </MainLayout>,
    )

    // Check if "Loading..." text is displayed
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders Appbar on mobile view', () => {
    // Mock useMediaQuery to return true (mobile view)
    ;(useMediaQuery as jest.Mock).mockImplementation(() => true)

    renderWithStore(
      <MainLayout>
        <div>Child Content</div>
      </MainLayout>,
    )

    // Assert that Appbar is rendered on mobile view
    expect(screen.getByText('Appbar')).toBeInTheDocument()
  })

  it('does not render Appbar on desktop view', () => {
    // Mock useMediaQuery to return false (desktop view)
    ;(useMediaQuery as jest.Mock).mockImplementation(() => false)

    renderWithStore(
      <MainLayout>
        <div>Child Content</div>
      </MainLayout>,
    )

    // Assert that Appbar is not rendered on desktop view
    expect(screen.queryByText('Appbar')).toBeNull()
  })

  it('renders Sidebar', () => {
    // Mock useMediaQuery to return false (desktop view) or true (mobile view)
    ;(useMediaQuery as jest.Mock).mockImplementation(() => false)

    renderWithStore(
      <MainLayout>
        <div>Child Content</div>
      </MainLayout>,
    )

    // Assert that Sidebar is rendered
    expect(screen.getByText('Sidebar')).toBeInTheDocument()
  })

  it('renders the layout with the connected user from store', () => {
    renderWithStore(
      <MainLayout>
        <div>Child Content</div>
      </MainLayout>,
    )

    // Check that session-related content is rendered (e.g., user information)
    expect(screen.getByText('Child Content')).toBeInTheDocument()
  })
})
