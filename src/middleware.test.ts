// __tests__/middleware.test.ts
import { NextResponse } from 'next/server';
import { middleware } from '@/middleware'; // Adjust path as needed
import type { NextRequest } from 'next/server';

jest.mock('next/server', () => ({
  NextResponse: {
    redirect: jest.fn(),
    next: jest.fn(),
  },
}));

describe('Middleware', () => {
  const mockNextUrl = (pathname: string) => ({
    pathname,
    clone: jest.fn().mockReturnValue({ pathname }),
  });

  it('should skip public files', () => {
    const request = { nextUrl: mockNextUrl('/file.png') } as unknown as NextRequest;

    const result = middleware(request);

    expect(result).toBeUndefined();
    expect(NextResponse.redirect).not.toHaveBeenCalled();
    expect(NextResponse.next).not.toHaveBeenCalled();
  });

  it('should skip _next routes', () => {
    const request = { nextUrl: mockNextUrl('/_next/static/file.js') } as unknown as NextRequest;

    const result = middleware(request);

    expect(result).toBeUndefined();
    expect(NextResponse.redirect).not.toHaveBeenCalled();
    expect(NextResponse.next).not.toHaveBeenCalled();
  });

  it('should redirect to default locale for missing locale', () => {
    const request = { nextUrl: mockNextUrl('/about') } as unknown as NextRequest;

    middleware(request);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/fr/about' })
    );
    expect(NextResponse.next).not.toHaveBeenCalled();
  });

  it('should redirect to default locale for unsupported locale', () => {
    const request = { nextUrl: mockNextUrl('/es/about') } as unknown as NextRequest;

    middleware(request);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/fr/es/about' })
    );
    expect(NextResponse.next).not.toHaveBeenCalled();
  });

  it('should proceed with valid locale', () => {
    const request = { nextUrl: mockNextUrl('/en/about') } as unknown as NextRequest;

    middleware(request);

    expect(NextResponse.next).toHaveBeenCalled();
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });
});
