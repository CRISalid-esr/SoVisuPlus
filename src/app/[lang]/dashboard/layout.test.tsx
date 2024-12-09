import { render, screen } from '@testing-library/react'
import { useMediaQuery } from '@mui/system'
import { SessionProvider } from 'next-auth/react' // Import SessionProvider
import { useSession } from 'next-auth/react'
import DashboardLayout from './layout' // Adjust path as needed

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
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, // Mock AuthenticatedRoute to return children
}))

jest.mock('next-auth/react', () => ({
  ...jest.requireActual('next-auth/react'),
  useSession: jest.fn(),
}))

describe('DashboardLayout', () => {
  beforeEach(() => {
    const session =  useSession as jest.Mock
    session.mockImplementation(() => ({
      data: { user: { name: 'Test User' } },
      status: 'authenticated',
    }));
  })

  // Helper function to render with SessionProvider
  const renderWithSessionProvider = (children: React.ReactNode) => {
    return render(
      <SessionProvider session={null}>
        {' '}
        {/* Wrap with SessionProvider */}
        {children}
      </SessionProvider>,
    )
  }

  it('renders the layout with children', () => {
    renderWithSessionProvider(
      <DashboardLayout>
        <div>Child Content</div>
      </DashboardLayout>,
    )

    // Check that child content is rendered
    expect(screen.getByText('Child Content')).toBeInTheDocument()
  })

  it('renders Appbar on mobile view', () => {
    // Mock useMediaQuery to return true (mobile view)
    (useMediaQuery as jest.Mock).mockImplementation(() => true)

    renderWithSessionProvider(
      <DashboardLayout>
        <div>Child Content</div>
      </DashboardLayout>,
    )

    // Assert that Appbar is rendered on mobile view
    expect(screen.getByText('Appbar')).toBeInTheDocument()
  })

  it('does not render Appbar on desktop view', () => {
    // Mock useMediaQuery to return false (desktop view)
    (useMediaQuery as jest.Mock).mockImplementation(() => false)

    renderWithSessionProvider(
      <DashboardLayout>
        <div>Child Content</div>
      </DashboardLayout>,
    )

    // Assert that Appbar is not rendered on desktop view
    expect(screen.queryByText('Appbar')).toBeNull()
  })

  it('renders Sidebar', () => {
    // Mock useMediaQuery to return false (desktop view) or true (mobile view)
    (useMediaQuery as jest.Mock).mockImplementation(() => false)

    renderWithSessionProvider(
      <DashboardLayout>
        <div>Child Content</div>
      </DashboardLayout>,
    )

    // Assert that Sidebar is rendered
    expect(screen.getByText('Sidebar')).toBeInTheDocument()
  })

  it('renders the layout with a mock session', () => {
    const session =  useSession as jest.Mock

    session.mockImplementation(() => ({
      data: { user: { name: 'Test User' } },
      status: 'authenticated',
    }))

    renderWithSessionProvider(
      <DashboardLayout>
        <div>Child Content</div>
      </DashboardLayout>,
    )

    // Check that session-related content is rendered (e.g., user information)
    expect(screen.getByText('Child Content')).toBeInTheDocument()
  })
})
