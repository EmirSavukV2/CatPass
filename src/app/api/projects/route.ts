import { NextRequest, NextResponse } from 'next/server';
import { getUserGroups } from '@/lib/groups-service';
import { initializeAdminApp } from '@/lib/firebase-admin';
import { getUserProjects } from '@/lib/projects-service';

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
            const projects = await getUserProjects(userId);

            const response = NextResponse.json({
                projects: projects
            });
            return addCorsHeaders(response);
        }else{
            console.log('Firebase Admin SDK not initialized, using demo user');
            const projects = await getUserProjects('demo-user');

            const response = NextResponse.json({
                projects: projects
            });
            return addCorsHeaders(response);
        }

    } catch (error) {
        console.error('Groups fetch error:', error);
        const response = NextResponse.json({
            error: 'Failed to fetch groups'
        }, { status: 500 });
        return addCorsHeaders(response);
    }
}
