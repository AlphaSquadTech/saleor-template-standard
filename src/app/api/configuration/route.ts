import { NextResponse } from 'next/server';

/**
 * DEPRECATED: This API route is no longer used.
 * Configuration is now handled server-side in the layout.tsx to prevent
 * exposing configuration data to the client side.
 * 
 * This endpoint is kept for backward compatibility but will return an error.
 */
export async function GET() {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Configuration is now handled server-side.',
      message: 'Configuration data is no longer exposed to the client side for security reasons.'
    },
    { status: 410 } // 410 Gone - resource is no longer available
  );
}