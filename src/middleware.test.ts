import { NextRequest, NextResponse } from 'next/server';
import { middleware } from './middleware';

jest.mock('next/server', () => ({
  NextResponse: {
    redirect: jest.fn(),
    next: jest.fn(),
  },
}));

describe('Middleware', () => {
  const defaultLocale = 'fr';

  const createRequest = (pathname: string) => {
    return {
      nextUrl: {
        pathname,
        clone: () => ({
          pathname,
        }),
      },
    } as NextRequest;
  };

  it('should redirect to default locale if no locale is specified', () => {
    const request = createRequest('/about');
    const response = middleware(request);
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: `/${defaultLocale}/about` })
    );
    expect(response).toBeUndefined();
  });

  it('should proceed with NextResponse.next() if a supported locale is present', () => {
    const request = createRequest('/en/about');
    const response = middleware(request);
    expect(NextResponse.next).toHaveBeenCalled();
    expect(NextResponse.redirect).not.toHaveBeenCalled();
    expect(response).toBeUndefined();
  });

  it('should redirect if an unsupported locale is present', () => {
    const request = createRequest('/es/about');
    const response = middleware(request);
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: `/${defaultLocale}/es/about` })
    );
    expect(response).toBeUndefined();
  });

  it('should skip redirect for public files', () => {
    const request = createRequest('/_next/static/file.js');
    const response = middleware(request);
    expect(NextResponse.redirect).not.toHaveBeenCalled();
    expect(NextResponse.next).not.toHaveBeenCalled();
    expect(response).toBeUndefined();
  });

  it('should skip redirect for API routes', () => {
    const request = createRequest('/api/data');
    const response = middleware(request);
    expect(NextResponse.redirect).not.toHaveBeenCalled();
    expect(NextResponse.next).not.toHaveBeenCalled();
    expect(response).toBeUndefined();
  });
});
