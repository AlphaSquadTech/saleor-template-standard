import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  const base = {
    path: '/',
    expires: new Date(0),
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
  res.cookies.set('token', '', base);
  res.cookies.set('refreshToken', '', base);
  res.cookies.set('isLoggedIn', '', { ...base, httpOnly: false });
  return res;
}
