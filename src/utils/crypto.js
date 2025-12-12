/**
 * CryptoHelper
 * Implements AES-GCM encryption/decryption using WebCrypto API
 */
const CryptoHelper = {
    // 1. Derives a 256-bit AES-GCM key from a user-provided secret string
    deriveKey: async (secret) => {
        try {
            const encoder = new TextEncoder();
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                encoder.encode(secret),
                { name: 'PBKDF2' },
                false,
                ['deriveKey']
            );
            
            // Use a static salt. This is acceptable because the secret key itself should be high-entropy.
            const salt = encoder.encode('e2ee-chat-salt');
            
            return await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );
        } catch (e) {
            console.error("Key derivation failed:", e);
            throw new Error("Could not derive key. Is your secret key correct?");
        }
    },

    // 2. Encrypts a plaintext message
    encryptMessage: async (key, plaintext) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(plaintext);
        
        // IV must be unique for every encryption
        const iv = crypto.getRandomValues(new Uint8Array(12)); 
        
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            data
        );
        
        // Combine IV and ciphertext for storage.
        // We convert binary data to Base64 strings to safely store in Firestore.
        const ivString = btoa(String.fromCharCode.apply(null, iv));
        const cipherString = btoa(String.fromCharCode.apply(null, new Uint8Array(ciphertext)));

        return `${ivString}:${cipherString}`;
    },

    // 3. Decrypts a ciphertext message
    decryptMessage: async (key, combinedCiphertext) => {
        try {
            const [ivString, cipherString] = combinedCiphertext.split(':');
            if (!ivString || !cipherString) {
                throw new Error("Invalid ciphertext format.");
            }

            // Convert Base64 strings back to binary
            const iv = new Uint8Array(atob(ivString).split('').map(c => c.charCodeAt(0)));
            const ciphertext = new Uint8Array(atob(cipherString).split('').map(c => c.charCodeAt(0)));

            const decryptedBuffer = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                key,
                ciphertext
            );

            return new TextDecoder().decode(decryptedBuffer);
        } catch (e) {
            console.error("Decryption failed:", e);
            // Return a placeholder so the UI doesn't crash
            return "[DECRYPTION FAILED]";
        }
    }
};

export default CryptoHelper;