/**
 * Cryptographic utilities using Web Crypto API for client-side E2EE operations
 */

/**
 * Generate a cryptographically secure random salt
 */
export function generateSalt(): ArrayBuffer {
  return crypto.getRandomValues(new Uint8Array(16)).buffer;
}

/**
 * Generate a random data key for encrypting individual secrets
 */
export function generateDataKey(): ArrayBuffer {
  return crypto.getRandomValues(new Uint8Array(32)).buffer;
}

/**
 * Derive an encryption key from a master password using PBKDF2
 */
export async function deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // Import the password as a raw key
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  // Derive the encryption key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 300000, // High iteration count for security
      hash: 'SHA-256'
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate an RSA-OAEP key pair for the user
 */
export async function generateUserKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Export a public key to PEM format
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', publicKey);
  const exportedAsString = arrayBufferToBase64(exported);
  return `-----BEGIN PUBLIC KEY-----\n${exportedAsString}\n-----END PUBLIC KEY-----`;
}

/**
 * Import a public key from PEM format
 */
export async function importPublicKey(pemKey: string): Promise<CryptoKey> {
  const pemHeader = "-----BEGIN PUBLIC KEY-----";
  const pemFooter = "-----END PUBLIC KEY-----";
  const pemContents = pemKey.substring(pemHeader.length, pemKey.length - pemFooter.length);
  const binaryDerString = base64ToArrayBuffer(pemContents.replace(/\s/g, ''));
  
  return crypto.subtle.importKey(
    'spki',
    binaryDerString,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    true,
    ['encrypt']
  );
}

/**
 * Export a private key and encrypt it with AES-GCM
 */
export async function exportAndEncryptPrivateKey(privateKey: CryptoKey, encryptionKey: CryptoKey): Promise<string> {
  // Export the private key
  const exported = await crypto.subtle.exportKey('pkcs8', privateKey);
  
  // Generate IV for AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt the private key
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    encryptionKey,
    exported
  );
  
  // Combine IV and encrypted data
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return arrayBufferToBase64(combined.buffer);
}

/**
 * Decrypt and import a private key
 */
export async function decryptAndImportPrivateKey(encryptedPrivateKey: string, encryptionKey: CryptoKey): Promise<CryptoKey> {
  const combined = base64ToArrayBuffer(encryptedPrivateKey);
  
  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  // Decrypt the private key
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    encryptionKey,
    encrypted
  );
  
  // Import the private key
  return crypto.subtle.importKey(
    'pkcs8',
    decrypted,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    false,
    ['decrypt']
  );
}

/**
 * Encrypt data with AES-GCM using a data key
 */
export async function encryptData(data: string, dataKey: ArrayBuffer): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  // Import the data key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    dataKey,
    'AES-GCM',
    false,
    ['encrypt']
  );
  
  // Generate IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt the data
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    cryptoKey,
    dataBuffer
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return arrayBufferToBase64(combined.buffer);
}

/**
 * Decrypt data with AES-GCM using a data key
 */
export async function decryptData(encryptedData: string, dataKey: ArrayBuffer): Promise<string> {
  const combined = base64ToArrayBuffer(encryptedData);
  
  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  // Import the data key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    dataKey,
    'AES-GCM',
    false,
    ['decrypt']
  );
  
  // Decrypt the data
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    cryptoKey,
    encrypted
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypt a data key with RSA-OAEP using a public key
 */
export async function encryptDataKey(dataKey: ArrayBuffer, publicKey: CryptoKey): Promise<string> {
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP'
    },
    publicKey,
    dataKey
  );
  
  return arrayBufferToBase64(encrypted);
}

/**
 * Decrypt a data key with RSA-OAEP using a private key
 */
export async function decryptDataKey(encryptedDataKey: string, privateKey: CryptoKey): Promise<ArrayBuffer> {
  const encryptedBuffer = base64ToArrayBuffer(encryptedDataKey);
  
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP'
    },
    privateKey,
    encryptedBuffer
  );
  
  return decrypted;
}

/**
 * Utility functions for base64 encoding/decoding
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
