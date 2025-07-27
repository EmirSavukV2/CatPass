import { NextRequest, NextResponse } from 'next/server';

// Add CORS headers for extension
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return addCorsHeaders(response);
}

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    if (!password) {
      const response = NextResponse.json({ 
        success: false, 
        error: 'Password is required' 
      }, { status: 400 });
      return addCorsHeaders(response);
    }

    // For demo purposes, we'll accept any password
    // In production, you'd verify the master password against the encrypted private key
    
    const response = NextResponse.json({
      success: true,
      message: 'Vault unlocked successfully'
    });

    // Set a cookie to indicate vault is unlocked
    response.cookies.set('vault_unlocked', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return addCorsHeaders(response);
  } catch (error) {
    console.error('Vault unlock error:', error);
    const response = NextResponse.json({ 
      success: false, 
      error: 'Failed to unlock vault' 
    }, { status: 500 });
    return addCorsHeaders(response);
  }
}
