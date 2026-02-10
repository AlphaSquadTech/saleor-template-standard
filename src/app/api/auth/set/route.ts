import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { token, refreshToken, maxAgeSeconds = 60 * 60 * 24 * 7 } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const res = NextResponse.json({ ok: true });
    const isProd = process.env.NODE_ENV === 'production';

    // HttpOnly cookie for middleware
    res.cookies.set('token', token, {
      httpOnly: true,   // 🔒 must be HttpOnly
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeSeconds,
    });

    // Optional: refresh token
    if (refreshToken) {
      res.cookies.set('refreshToken', refreshToken, {
        httpOnly: true,  // 🔒 secure storage
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: maxAgeSeconds,
      });
    }

    // Optional: frontend-friendly flag
    res.cookies.set('isLoggedIn', '1', {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeSeconds,
    });

    return res;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
