import { NextRequest, NextResponse } from 'next/server';
import { initializeAdminApp } from '@/lib/firebase-admin';
import { useSecrets } from '@/hooks/use-secrets';
import { SecretsService } from '@/lib/secrets-service';

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

        // Check for Firebase ID token in cookies or Authorization header
        const cookieStore = request.cookies
    
        
        // Firebase'in oturum çerezini (`__session`) oku
        const sessionCookie = request.cookies.get('__session')?.value;
        
        if (!sessionCookie) {
          const response = NextResponse.json({ authenticated: false, user: null }, { status: 401 });
          return addCorsHeaders(response);
        }
        
  if (initializeAdminApp().auth()) {
    console.log('Verifying Firebase ID token...');
      const decodedToken = await initializeAdminApp().auth().verifySessionCookie(sessionCookie);

      const userId = decodedToken.uid;
  // Get query parameters
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId') || undefined;
  const groupId = searchParams.get('groupId') || undefined;

  console.log('Fetching secrets for user:', userId, { projectId, groupId });
  
  
    
  }


    // For demo purposes, return empty array since we don't have encryption key
    // In production, you'd need the user's master key to decrypt secrets
    const secrets: unknown[] = [];


    const response = NextResponse.json({
      secrets: secrets
    });
    return addCorsHeaders(response);
  } catch (error) {
    console.error('Secrets fetch error:', error);
    const response = NextResponse.json({ 
      error: 'Failed to fetch secrets' 
    }, { status: 500 });
    return addCorsHeaders(response);
  }
}
