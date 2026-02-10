import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = NextResponse.json({
      status: "success",
      message: "Storefront connection test successful",
      timestamp: new Date().toISOString(),
    });

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return response;
  } catch (error) {
    console.error("Test endpoint error:", error);
    const errorResponse = NextResponse.json(
      { 
        status: "error", 
        message: "Test endpoint failed" 
      }, 
      { status: 500 }
    );

    // Add CORS headers to error response too
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    errorResponse.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return errorResponse;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
