import { render, screen } from '@testing-library/react';
import Home from './page'; // Import the server component

// Mock external dependencies
jest.mock('./components/UnauthenticatedRoute', () => ({ children }) => (
  <div className="unauthenticated-route">{children}</div>
));

jest.mock('./splash', () => () => <div className="splash">Splash Component</div>);

describe('Home Server Component', () => {
  it('renders the Splash component inside UnauthenticatedRoute', async () => {
    // Render the component
    const { container } = render(await Home());

    // Assertions using DOM structure
    const unauthenticatedRoute = container.querySelector('.unauthenticated-route');
    const splash = container.querySelector('.splash');

    expect(unauthenticatedRoute).toBeInTheDocument();
    expect(splash).toBeInTheDocument();
  });
});
