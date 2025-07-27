import { initializeAdminApp } from '@/lib/firebase-admin';
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

export async function GET(request: NextRequest) {
  try {
    console.log('Auth status check - Live auth mode');
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
      try {
        console.log('Verifying Firebase ID token...');
        const decodedToken = await initializeAdminApp().auth().verifySessionCookie(sessionCookie);

        console.log('Token verified successfully for user:', decodedToken.uid);
        
        // Check if vault is unlocked
        const isUnlocked = cookieStore.get('vault_unlocked')?.value === 'true' ||
                          cookieStore.get('vault-unlocked')?.value === 'true';

        const response = NextResponse.json({
          authenticated: true,
          isUnlocked: isUnlocked,
          user: {
            uid: decodedToken.uid,
            authUid: decodedToken.uid,
            email: decodedToken.email || 'unknown@example.com',
            displayName: decodedToken.name || decodedToken.email || 'Unknown User',
            publicKey: '',
            encryptedPrivateKey: '',
            kdfSalt: ''
          }
        });
        return addCorsHeaders(response);
      } catch (firebaseError) {
        console.error('Firebase token verification failed:', firebaseError);
        const response = NextResponse.json({ 
          authenticated: false, 
          isUnlocked: false,
          user: null 
        });
        return addCorsHeaders(response);
      }
    } else {
      // Fallback to demo mode if Firebase Admin is not configured
      console.log('Firebase Admin not configured, using demo mode');
      
        
      const response = NextResponse.json({ authenticated: false, user: null }, { status: 401 });
      return addCorsHeaders(response);
    }
  } catch (error) {
    console.error('Auth status check error:', error);
    const response = NextResponse.json({ 
      authenticated: false, 
      isUnlocked: false,
      user: null 
    }, { status: 500 });
    return addCorsHeaders(response);
  }
}
