import { chain } from '@/middlewares/chain';
import type { NextFetchEvent, NextRequest,NextResponse } from 'next/server'
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
  let req: NextRequest, res: NextResponse, event: NextFetchEvent;

  beforeEach(() => {
    req = {} as unknown as NextRequest; // Mocked request
    res = { headers: new Headers() } as unknown as NextResponse; // Mocked response with headers
    event = {}  as unknown as NextFetchEvent; // Mocked fetch event
  });

  it('modifies response headers correctly in sequence', async () => {
    const mockMiddleware1 = jest.fn((next) => async (req: NextRequest, event: NextFetchEvent, res: NextResponse) => {
      res.headers.set('X-Middleware-1', 'Executed');
      return next(req, event, res); // Call next middleware
    });

    const mockMiddleware2 = jest.fn((next) => async (req: NextRequest, event: NextFetchEvent, res: NextResponse) => {
      res.headers.set('X-Middleware-2', 'Executed');
      return next(req, event, res); // Call next middleware
    });

    // Chain the middlewares
    const middlewareChain = chain([mockMiddleware1, mockMiddleware2]);

    // Execute the middleware chain
    await middlewareChain(req, event, res);

    // Check the headers were modified correctly
    expect(res.headers.get('X-Middleware-1')).toBe('Executed');
    expect(res.headers.get('X-Middleware-2')).toBe('Executed');
  });
});
