import { render } from '@testing-library/react';
import Home from './page';
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => Promise.resolve({ user: { name: 'Test User' } })),
}));

jest.mock('../auth/auth_options', () => ({}));

jest.mock('./splash', () => ({
  __esModule: true,
  default: jest.fn(() => <div>Mock Splash Component</div>),
}));

describe('Home Component', () => {
  it('renders without crashing', async () => {
    const props = { params: { lang: 'en' } };
    const { container } = render(await Home(props));
    expect(container).toBeInTheDocument();
  });
});
