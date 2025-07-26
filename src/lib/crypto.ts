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
  console.log('Starting public key export...');
  try {
    const exported = await crypto.subtle.exportKey('spki', publicKey);
    console.log('Public key exported successfully, size:', exported.byteLength);
    const exportedAsString = arrayBufferToBase64(exported);
    console.log('Public key converted to base64, length:', exportedAsString.length);
    const pemKey = `-----BEGIN PUBLIC KEY-----\n${exportedAsString}\n-----END PUBLIC KEY-----`;
    console.log('PEM key created successfully');
    return pemKey;
  } catch (error) {
    console.error('Error exporting public key:', error);
    throw error;
  }
}

/**
 * Import a public key from PEM format
 */
export async function importPublicKey(pemKey: string): Promise<CryptoKey> {
  if (!pemKey || typeof pemKey !== 'string') {
    throw new Error('Invalid PEM key: key is undefined or not a string');
  }
  
  const pemHeader = "-----BEGIN PUBLIC KEY-----";
  const pemFooter = "-----END PUBLIC KEY-----";
  
  if (!pemKey.includes(pemHeader) || !pemKey.includes(pemFooter)) {
    throw new Error('Invalid PEM key format: missing headers or footers');
  }
  
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

/**
 * Generate a group key pair
 */
export async function generateGroupKeyPair(): Promise<CryptoKeyPair> {
  console.log('Starting group key pair generation...');
  try {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
    console.log('Group key pair generated successfully');
    return keyPair;
  } catch (error) {
    console.error('Error generating group key pair:', error);
    throw error;
  }
}

/**
 * Export a private key and encrypt it for a specific user
 */
export async function encryptGroupPrivateKeyForUser(
  groupPrivateKey: CryptoKey, 
  userPublicKey: CryptoKey
): Promise<string> {
  console.log('Starting group private key encryption...');
  try {
    // Export the group private key
    console.log('Exporting group private key...');
    const exported = await crypto.subtle.exportKey('pkcs8', groupPrivateKey);
    console.log('Group private key exported successfully, size:', exported.byteLength);
    
    // Check if the exported key is too large for RSA encryption
    if (exported.byteLength > 190) { // RSA-OAEP can encrypt max ~190 bytes with 2048-bit key
      console.log('Private key too large for direct RSA encryption, using hybrid approach...');
      
      // Generate AES key for hybrid encryption
      const aesKey = crypto.getRandomValues(new Uint8Array(32)); // 256-bit AES key
      
      // Encrypt private key with AES-GCM
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const aesKeyObject = await crypto.subtle.importKey(
        'raw',
        aesKey,
        'AES-GCM',
        false,
        ['encrypt']
      );
      
      const encryptedPrivateKey = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        aesKeyObject,
        exported
      );
      
      // Encrypt AES key with RSA
      const encryptedAesKey = await crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP'
        },
        userPublicKey,
        aesKey
      );
      
      // Combine: [4 bytes: aes key length][encrypted aes key][12 bytes: iv][encrypted data]
      const aesKeyLength = new Uint32Array([encryptedAesKey.byteLength]);
      const combined = new Uint8Array(
        4 + encryptedAesKey.byteLength + iv.byteLength + encryptedPrivateKey.byteLength
      );
      
      let offset = 0;
      combined.set(new Uint8Array(aesKeyLength.buffer), offset);
      offset += 4;
      combined.set(new Uint8Array(encryptedAesKey), offset);
      offset += encryptedAesKey.byteLength;
      combined.set(iv, offset);
      offset += iv.byteLength;
      combined.set(new Uint8Array(encryptedPrivateKey), offset);
      
      const result = arrayBufferToBase64(combined.buffer);
      console.log('Group private key encryption completed successfully (hybrid)');
      return result;
    } else {
      console.log('Using direct RSA encryption...');
      // Direct RSA encryption for small keys
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP'
        },
        userPublicKey,
        exported
      );
      
      const result = arrayBufferToBase64(encrypted);
      console.log('Group private key encryption completed successfully (direct RSA)');
      return result;
    }
  } catch (error) {
    console.error('Error encrypting group private key:', error);
    throw error;
  }
}

/**
 * Decrypt and import a group private key
 */
export async function decryptGroupPrivateKey(
  encryptedGroupPrivateKey: string, 
  userPrivateKey: CryptoKey
): Promise<CryptoKey> {
  console.log('Starting group private key decryption...');
  try {
    const combinedBuffer = base64ToArrayBuffer(encryptedGroupPrivateKey);
    const combined = new Uint8Array(combinedBuffer);
    
    // Check if this is hybrid encryption (has length prefix)
    if (combined.byteLength >= 4) {
      const aesKeyLengthArray = new Uint32Array(combined.slice(0, 4).buffer);
      const aesKeyLength = aesKeyLengthArray[0];
      
      // If the length makes sense for RSA encryption, this is hybrid
      if (aesKeyLength === 256) { // 2048-bit RSA encrypted data is 256 bytes
        console.log('Detected hybrid encryption format');
        
        let offset = 4;
        const encryptedAesKey = combined.slice(offset, offset + aesKeyLength).buffer;
        offset += aesKeyLength;
        
        const iv = combined.slice(offset, offset + 12);
        offset += 12;
        
        const encryptedPrivateKey = combined.slice(offset).buffer;
        
        // Decrypt the AES key with user's private key
        console.log('Decrypting AES key with RSA...');
        const aesKeyRaw = await crypto.subtle.decrypt(
          {
            name: 'RSA-OAEP'
          },
          userPrivateKey,
          encryptedAesKey
        );
        
        // Import the AES key
        const aesKey = await crypto.subtle.importKey(
          'raw',
          aesKeyRaw,
          'AES-GCM',
          false,
          ['decrypt']
        );
        
        // Decrypt the private key with AES
        console.log('Decrypting private key with AES...');
        const decryptedPrivateKey = await crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: iv
          },
          aesKey,
          encryptedPrivateKey
        );
        
        // Import the group private key
        const groupPrivateKey = await crypto.subtle.importKey(
          'pkcs8',
          decryptedPrivateKey,
          {
            name: 'RSA-OAEP',
            hash: 'SHA-256'
          },
          true, // Make extractable for re-encryption
          ['decrypt']
        );
        
        console.log('Group private key decryption completed successfully (hybrid)');
        return groupPrivateKey;
      }
    }
    
    // Fallback to direct RSA decryption
    console.log('Using direct RSA decryption...');
    const decryptedPrivateKey = await crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP'
      },
      userPrivateKey,
      combinedBuffer
    );
    
    // Import the group private key
    const groupPrivateKey = await crypto.subtle.importKey(
      'pkcs8',
      decryptedPrivateKey,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256'
      },
      true, // Make extractable for re-encryption
      ['decrypt']
    );
    
    console.log('Group private key decryption completed successfully (direct RSA)');
    return groupPrivateKey;
  } catch (error) {
    console.error('Error decrypting group private key:', error);
    throw error;
  }
}
