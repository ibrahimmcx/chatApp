/**
 * Global RSA Key Manager
 * Stores keys in memory to avoid SecureStore retrieval issues
 */

let cachedKeys = {
    publicKey: null,
    privateKey: null,
};

export function setKeys(publicKey, privateKey) {
    console.log('[KeyManager] Anahtarlar bellekte saklanıyor');
    cachedKeys.publicKey = publicKey;
    cachedKeys.privateKey = privateKey;
}

export function getPublicKey() {
    return cachedKeys.publicKey;
}

export function getPrivateKey() {
    return cachedKeys.privateKey;
}

export function clearKeys() {
    console.log('[KeyManager] Anahtarlar bellekten temizleniyor');
    cachedKeys.publicKey = null;
    cachedKeys.privateKey = null;
}

export function hasKeys() {
    return !!(cachedKeys.publicKey && cachedKeys.privateKey);
}
