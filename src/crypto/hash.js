/**
 * SHA-256 Hash
 */

import * as Crypto from 'expo-crypto';

export async function hashPassword(password) {
    const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
    );
    return hash;
}
