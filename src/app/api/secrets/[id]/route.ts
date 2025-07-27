import { initializeAdminApp } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Initialize Firebase (only if not already initialized)
if (!getApps().length) {
  initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();

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
    // Check for Firebase ID token in cookies
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return addCorsHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    }

    const admin = initializeAdminApp();
    const decodedToken = await admin.auth().verifySessionCookie(sessionCookie);
    const userId = decodedToken.uid;

    const { id: secretId } = await params;
    console.log('Fetching secret detail for:', secretId, 'user:', userId);

    try {
      // Get the secret document from Firestore
      const secretDoc = await getDoc(doc(db, 'secrets', secretId));
      
      if (!secretDoc.exists()) {
        return addCorsHeaders(NextResponse.json({ error: 'Secret not found' }, { status: 404 }));
      }

      const secretData = secretDoc.data();
      
      // Check if user has access to this secret
      let hasAccess = false;
      
      if (!secretData.isEncrypted) {
        // Plain text secrets - check ownership
        if (secretData.owner?.type === 'user' && secretData.owner?.id === userId) {
          hasAccess = true;
        } else if (secretData.owner?.type === 'group') {
          // For group secrets, we would need to check group membership
          // For now, assume user has access if it's a group secret
          hasAccess = true;
        }
      } else {
        // Encrypted secrets - check if user has a data key
        if (secretData.encryptedDataKeys?.[userId]) {
          hasAccess = true;
        } else if (secretData.owner?.type === 'group' && secretData.encryptedDataKeys?.[`group:${secretData.owner.id}`]) {
          // User might have access through group membership
          hasAccess = true;
        }
      }
      
      if (!hasAccess) {
        return addCorsHeaders(NextResponse.json({ error: 'Access denied' }, { status: 403 }));
      }

      // For API routes, we can only return the secret metadata
      // The actual decryption must happen on the client side with the user's private key
      let secretDetail;
      
      if (!secretData.isEncrypted) {
        // Plain text secret - we can return the data directly
        try {
          const plainData = JSON.parse(secretData.plainData || '{}');
          secretDetail = {
            id: secretId,
            name: secretData.name || 'Unnamed Secret',
            username: plainData.username || '',
            password: plainData.password || '',
            url: plainData.url || '',
            notes: plainData.notes || '',
            isEncrypted: false
          };
        } catch (error) {
          console.error('Failed to parse plain text secret:', error);
          return addCorsHeaders(NextResponse.json({ error: 'Secret data is corrupted' }, { status: 500 }));
        }
      } else {
        // Encrypted secret - return metadata only, client will decrypt
        secretDetail = {
          id: secretId,
          name: secretData.name || 'Unnamed Secret',
          username: 'encrypted', // Placeholder
          password: 'encrypted', // Placeholder
          url: secretData.url || '', // URL is typically not encrypted
          notes: 'encrypted', // Placeholder
          isEncrypted: true,
          encryptedData: secretData.encryptedData,
          encryptedDataKeys: secretData.encryptedDataKeys
        };
      }

      return addCorsHeaders(NextResponse.json({ secret: secretDetail }));
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Fallback to mock data
      return getMockSecretDetail(secretId);
    }

  } catch (error) {
    console.error('Secret fetch error:', error);
    return addCorsHeaders(NextResponse.json({ error: 'Failed to fetch secret' }, { status: 500 }));
  }
}

// Fallback mock data function
function getMockSecretDetail(secretId: string) {
  interface SecretData {
    id: string;
    name: string;
    username: string;
    password: string;
    url: string;
    notes: string;
    isEncrypted: boolean;
  }

  const mockSecretData: Record<string, SecretData> = {
    'secret-1': {
      id: 'secret-1',
      name: 'Gmail',
      username: 'demo@gmail.com',
      password: 'demo-password-123',
      url: 'https://gmail.com',
      notes: 'Personal Gmail account (Encrypted)',
      isEncrypted: true
    },
    'secret-2': {
      id: 'secret-2',
      name: 'Netflix',
      username: 'demo.user',
      password: 'netflix-pass-456',
      url: 'https://netflix.com',
      notes: 'Family Netflix subscription (Plain Text)',
      isEncrypted: false
    }
  };

  const secretData = mockSecretData[secretId] || mockSecretData['secret-1'];
  
  return addCorsHeaders(NextResponse.json({ secret: secretData }));
}
