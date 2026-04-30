/**
 * RSA-2048 Şifreleme
 */

import forge from 'node-forge';
import { saveSecure, getSecure } from '../storage/secureStorage';
import { setKeys, getPrivateKey as getCachedPrivateKey } from './keyManager';

const PRIVATE_KEY_STORAGE = 'private_key';
const PUBLIC_KEY_STORAGE = 'public_key';

export async function generateKeyPair() {
    try {
        console.log('[RSA] Anahtar çifti üretiliyor...');

        const keypair = await new Promise((resolve, reject) => {
            try {
                const kp = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
                resolve(kp);
            } catch (err) {
                reject(err);
            }
        });

        const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
        const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);

        // Bellekte sakla (öncelik)
        setKeys(publicKeyPem, privateKeyPem);

        // SecureStore'a da kaydet (yedek)
        await saveSecure(PRIVATE_KEY_STORAGE, privateKeyPem);
        await saveSecure(PUBLIC_KEY_STORAGE, publicKeyPem);

        console.log('[RSA] Anahtar çifti oluşturuldu ve bellekte saklandı');

        return {
            publicKey: publicKeyPem,
            privateKey: privateKeyPem,
        };
    } catch (error) {
        console.error('[RSA] Hata:', error);
        throw new Error('RSA anahtar üretilemedi');
    }
}

export function encryptWithPublicKey(data, publicKeyPem) {
    try {
        const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
        const encrypted = publicKey.encrypt(data, 'RSA-OAEP');
        const encoded = forge.util.encode64(encrypted);
        return encoded;
    } catch (error) {
        console.error('[RSA] Şifreleme hatası:', error);
        throw new Error('RSA şifreleme başarısız');
    }
}

export async function decryptWithPrivateKey(encryptedData) {
    try {
        // Önce bellekten dene
        let privateKeyPem = getCachedPrivateKey();
        
        // Bellekte yoksa SecureStore'dan al
        if (!privateKeyPem) {
            console.log('[RSA] Bellekte anahtar yok, SecureStore kontrol ediliyor...');
            privateKeyPem = await getSecure(PRIVATE_KEY_STORAGE);
        }
        
        if (!privateKeyPem) {
            throw new Error('Private key bulunamadı');
        }

        const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
        const encrypted = forge.util.decode64(encryptedData);
        const decrypted = privateKey.decrypt(encrypted, 'RSA-OAEP');
        return decrypted;
    } catch (error) {
        console.error('[RSA] Çözme hatası:', error);
        throw new Error('RSA çözme başarısız');
    }
}

export async function getStoredPublicKey() {
    return await getSecure(PUBLIC_KEY_STORAGE);
}
