import { chain } from '@/middlewares/chain';
import { NextResponse } from 'next/server'; // Import NextResponse directly for mocking

// Mocking the individual middlewares
jest.mock('./middlewares/localeMiddleware', () => ({
  localeMiddleware: jest.fn(),
}));

jest.mock('./middlewares/authMiddleware', () => ({
  authMiddleware: jest.fn(),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn(() => "next-response"), // Ensure this returns the expected value
    redirect: jest.fn(() => "redirect-response"),
  },
}));


describe('Middleware Chain Effects', () => {
  let req, res, event;

  beforeEach(() => {
    req = {}; // Mocked request
    res = { headers: {} }; // Mocked response with headers
    event = {}; // Mocked fetch event
  });

  it('modifies response headers correctly in sequence', async () => {
    const mockMiddleware1 = jest.fn((next) => async (req, event, res) => {
      res.headers['X-Middleware-1'] = 'Executed';
      return next(req, event, res); // Call next middleware
    });

    const mockMiddleware2 = jest.fn((next) => async (req, event, res) => {
      res.headers['X-Middleware-2'] = 'Executed';
      return next(req, event, res); // Call next middleware
    });

    // Chain the middlewares
    const middlewareChain = chain([mockMiddleware1, mockMiddleware2]);

    // Execute the middleware chain
    await middlewareChain(req, event, res);

    // Check the headers were modified correctly
    expect(res.headers['X-Middleware-1']).toBe('Executed');
    expect(res.headers['X-Middleware-2']).toBe('Executed');
  });
});
