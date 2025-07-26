'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { 
  generateSalt, 
  deriveKey, 
  generateUserKeyPair, 
  exportPublicKey, 
  exportAndEncryptPrivateKey,
  arrayBufferToBase64 
} from '@/lib/crypto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    masterPassword: '',
    confirmMasterPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Firebase Auth, 2: Master Password
  const router = useRouter();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFirebaseAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setStep(2);
  };

  const handleMasterPasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (formData.masterPassword !== formData.confirmMasterPassword) {
      setError('Master passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.masterPassword.length < 8) {
      setError('Master password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    try {
      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      // Generate cryptographic keys
      const salt = generateSalt();
      const encryptionKey = await deriveKey(formData.masterPassword, salt);
      const keyPair = await generateUserKeyPair();
      
      // Export and encrypt the private key
      const publicKeyPem = await exportPublicKey(keyPair.publicKey);
      const encryptedPrivateKey = await exportAndEncryptPrivateKey(
        keyPair.privateKey, 
        encryptionKey
      );
      
      // Store user data in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        authUid: userCredential.user.uid,
        email: formData.email,
        displayName: formData.displayName || formData.email.split('@')[0],
        publicKey: publicKeyPem,
        encryptedPrivateKey: encryptedPrivateKey,
        kdfSalt: arrayBufferToBase64(salt),
      });

      router.push('/unlock');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFirebaseAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name (Optional)</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder="Enter your display name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
              </div>
              {error && (
                <div className="text-red-500 text-sm">{error}</div>
              )}
              <Button type="submit" className="w-full">
                Next: Set Master Password
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Set Master Password</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Your master password encrypts your data. 
            <strong className="text-red-600"> It cannot be recovered if forgotten!</strong>
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleMasterPasswordSetup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="masterPassword">Master Password</Label>
              <Input
                id="masterPassword"
                type="password"
                value={formData.masterPassword}
                onChange={(e) => handleInputChange('masterPassword', e.target.value)}
                placeholder="Enter a strong master password"
                required
              />
              <p className="text-xs text-gray-500">
                Use a strong, unique password. This will encrypt all your vault data.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmMasterPassword">Confirm Master Password</Label>
              <Input
                id="confirmMasterPassword"
                type="password"
                value={formData.confirmMasterPassword}
                onChange={(e) => handleInputChange('confirmMasterPassword', e.target.value)}
                placeholder="Confirm your master password"
                required
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Warning:</strong> Your master password cannot be recovered. 
                Write it down and store it safely!
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={isLoading}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
