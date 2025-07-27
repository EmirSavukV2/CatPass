// /app/api/auth/login/route.ts

import { initializeAdminApp } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {

  try {
    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
    }

    // ID Token'ın geçerlilik süresi. 2 hafta iyi bir başlangıç.
    const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 gün (milisaniye cinsinden)

    // ID Token'dan bir oturum çerezi oluştur.
    const sessionCookie = await initializeAdminApp().auth()?.createSessionCookie(idToken, { expiresIn });
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Failed to create session cookie' }, { status: 500 });
    }
    // Çerezi tarayıcıya göndermek için response oluştur.
    const response = NextResponse.json({ status: 'success' });
    
    // Çerezi Set-Cookie başlığına ekle.
    response.cookies.set('__session', sessionCookie, {
      httpOnly: true, // Client-side JS'in erişimini engeller, daha güvenli.
      secure: process.env.NODE_ENV === 'production', // Sadece HTTPS'te gönder.
      maxAge: expiresIn,
      path: '/', // Tüm site için geçerli.
      sameSite: 'lax', // Veya 'None' (aşağıdaki nota bakın).
    });

    console.log('Session cookie created successfully:', sessionCookie);
    

    return response;

  } catch (error) {
    console.error('Session login error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }
}