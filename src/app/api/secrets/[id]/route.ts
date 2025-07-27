import { initializeAdminApp } from '@/lib/firebase-admin';
import { SecretsService } from '@/lib/secrets-service';
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('Secret detail fetch - Demo mode active');

    const { id: secretId } = await params;

    // For demo purposes, return mock secret data with passwords
    // In production, you'd decrypt the actual secret from Firestore
    interface SecretData {
      id: string;
      name: string;
      username: string;
      password: string;
      url: string;
      notes: string;
    }
    
      // Check for Firebase ID token in cookies or Authorization header
        const cookieStore = request.cookies
    
        
        // Firebase'in oturum çerezini (`__session`) oku
        const sessionCookie = request.cookies.get('__session')?.value;
        
        if (!sessionCookie) {
          const response = NextResponse.json({ authenticated: false, user: null }, { status: 401 });
          return addCorsHeaders(response);
        }
        
        // Verify Firebase ID token if Firebase Admin is available
        if (initializeAdminApp().auth()) {
        console.log('Verifying Firebase ID token...');
        const decodedToken = await initializeAdminApp().auth().verifySessionCookie(sessionCookie);
        const userId = decodedToken.uid;
        
    console.log('Token verified successfully for user:', userId);


        }
  

    if (!secretData) {
      const response = NextResponse.json({ 
        error: 'Secret not found' 
      }, { status: 404 });
      return addCorsHeaders(response);
    }

    const response = NextResponse.json({
      secret: secretData
    });
    return addCorsHeaders(response);
  } catch (error) {
    console.error('Secret fetch error:', error);
    const response = NextResponse.json({ 
      error: 'Failed to fetch secret' 
    }, { status: 500 });
    return addCorsHeaders(response);
  }
}
