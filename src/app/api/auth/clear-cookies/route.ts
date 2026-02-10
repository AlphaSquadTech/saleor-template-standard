import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get('redirect') || '/';
  const reason = searchParams.get('reason');

  // Create a response that will clear the HTTP-only cookies
  const response = NextResponse.redirect(new URL(redirectTo, request.url));

  // Clear the auth cookies by setting them to expire in the past
  response.cookies.set({
    name: 'token',
    value: '',
    path: '/',
    expires: new Date(0), // Expire immediately
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  response.cookies.set({
    name: 'refreshToken',
    value: '',
    path: '/',
    expires: new Date(0), // Expire immediately
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  // Add debug headers in non-production
  if (process.env.NODE_ENV !== 'production') {
    response.headers.set('x-clear-cookies', '1');
    if (reason) {
      response.headers.set('x-clear-reason', reason);
    }
  }

  return response;
}
