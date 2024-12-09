import { chain } from '@/middlewares/chain';
import { localeMiddleware } from '@/middlewares/localeMiddleware';
import { authMiddleware } from '@/middlewares/authMiddleware';

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

describe('Middleware Chain', () => {
  let req, res, event;

  beforeEach(() => {
    req = {}; // Mocked request
    res = {}; // Mocked response
    event = {}; // Mocked fetch event
  });

  it('calls middlewares in sequence and returns the response', async () => {
    const mockMiddleware1 = jest.fn((next) => (req, event, res) => {
      console.log('Middleware 1 executed');
      return next(req, event, res); // Ensure it calls the next middleware once
    });

    const mockMiddleware2 = jest.fn((next) => (req, event, res) => {
      console.log('Middleware 2 executed');
      return next(req, event, res); // Ensure it calls the next middleware once
    });

    const middlewareChain = chain([mockMiddleware1, mockMiddleware2]);

    const response = await middlewareChain(req, event, res);

    // Ensure each middleware is called once
    expect(mockMiddleware1).toHaveBeenCalledTimes(1);
    expect(mockMiddleware2).toHaveBeenCalledTimes(1);

    // Ensure the final response is "next-response"
    expect(response).toBe("next-response");
  });

});