import { render, screen } from '@testing-library/react';
import { useMediaQuery } from '@mui/system'; // Corrected import from @mui/system
import DashboardLayout from './layout'; // Adjust the path as needed


// Mocking `useMediaQuery` from MUI System
jest.mock('@mui/system', () => ({
  ...jest.requireActual('@mui/system'),
  useMediaQuery: jest.fn(),
}));

// Mocking Appbar and Sidebar components to simplify testing
jest.mock('../components/appbar', () => ({
  Appbar: jest.fn(() => <div>Appbar</div>),
}));

jest.mock('../components/sidebar', () => ({
  Sidebar: jest.fn(() => <div>Sidebar</div>),
}));

describe('DashboardLayout', () => {
  beforeEach(() => {
    // Reset the mocks before each test
    (useMediaQuery as jest.Mock).mockReset();
  });

  it('renders the layout with children', () => {
    render(
      <DashboardLayout>
        <div>Child Content</div>
      </DashboardLayout>
    );

    // Ensure that the child content is rendered
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('correctly renders Appbar for mobile view', () => {
    (useMediaQuery as jest.Mock).mockImplementation(() => true); // Simulate mobile view

    render(
      <DashboardLayout>
        <div>Child Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText('Appbar')).toBeInTheDocument();
  });

  it('does not render Appbar for desktop view', () => {
    // Mock `useMediaQuery` to simulate desktop view (should return false for mobile)
    (useMediaQuery as jest.Mock).mockImplementation((query: string) => {
      if (query === '(max-width: 959px)') {
        return false; // Simulating a desktop view
      }
      return false;
    });

    render(
      <DashboardLayout>
        <div>Child Content</div>
      </DashboardLayout>
    );

    // Assert that Appbar is not rendered in desktop view
    expect(screen.queryByText('Appbar')).toBeNull();
  });
});
