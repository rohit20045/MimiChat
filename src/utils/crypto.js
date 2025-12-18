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
            
            // Use a static salt
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

        // Encode IV and ciphertext
        const ivString = btoa(String.fromCharCode(...iv));
        const cipherString = btoa(
            String.fromCharCode(...new Uint8Array(ciphertext))
        );

        //  Integrity hash (SHA-256 of plaintext)
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashString = btoa(
            String.fromCharCode(...new Uint8Array(hashBuffer))
        );

        return {
            payload: `${ivString}:${cipherString}`,
            hash: hashString
        };
    },


    decryptMessage: async (key, payload, expectedHash) => {
        try {
            const [ivString, cipherString] = payload.split(":");

            const iv = new Uint8Array(
                atob(ivString).split("").map(c => c.charCodeAt(0))
            );

            const ciphertext = new Uint8Array(
                atob(cipherString).split("").map(c => c.charCodeAt(0))
            );

            const decryptedBuffer = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv },
                key,
                ciphertext
            );

            const plaintext = new TextDecoder().decode(decryptedBuffer);

            // Verify integrity
            const verifyBuffer = await crypto.subtle.digest(
                "SHA-256",
                new TextEncoder().encode(plaintext)
            );

            const verifyHash = btoa(
                String.fromCharCode(...new Uint8Array(verifyBuffer))
            );

            if (verifyHash !== expectedHash) {
                return "[MESSAGE INTEGRITY FAILED]";
            }

            return plaintext;
        } catch (e) {
            console.error("Decryption failed:", e);
            return "[DECRYPTION_FAILED]";
        }
    }

};

export default CryptoHelper;