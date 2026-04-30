/**
 * Kimlik Doğrulama Servisi
 */

import { hashPassword } from '../crypto/hash';
import { generateKeyPair, getStoredPublicKey } from '../crypto/rsa';
import { setKeys } from '../crypto/keyManager';
import { startSession, endSession } from '../security/sessionManager';
import { clearAllSecure, getSecure } from '../storage/secureStorage';
import { generateUUID } from '../utils/helpers';
import { API } from '../config';

let currentSessionUser = null;

export async function registerUser(email, password, displayName) {
    try {
        console.log('[Auth] Kayıt işlemi başlıyor');

        const hashedPassword = await hashPassword(password);
        const { publicKey } = await generateKeyPair();

        const response = await fetch(API.REGISTER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                passwordHash: hashedPassword,
                displayName: displayName || email.split('@')[0],
                publicKey,
            }),
        });

        const result = await response.json();

        if (result.success) {
            const sessionToken = generateUUID();
            await startSession(sessionToken, result.userId, email);

            currentSessionUser = {
                userId: result.userId,
                email,
                displayName: displayName || email.split('@')[0],
            };

            return {
                success: true,
                userId: result.userId,
                displayName: displayName || email.split('@')[0],
            };
        }

        return result;
    } catch (error) {
        console.error('[Auth] Kayıt hatası:', error);
        return { success: false, message: 'Bağlantı hatası' };
    }
}

export async function loginUser(email, password) {
    try {
        console.log('[Auth] Giriş işlemi başlıyor');

        const hashedPassword = await hashPassword(password);

        const response = await fetch(API.LOGIN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                passwordHash: hashedPassword,
            }),
        });

        const result = await response.json();

        if (result.success) {
            const sessionToken = generateUUID();
            await startSession(sessionToken, result.userId, email);

            // HER GİRİŞTE YENİ ANAHTAR ÜRET
            console.log('[Auth] Yeni anahtar üretiliyor...');
            const keys = await generateKeyPair();
            const publicKey = keys.publicKey;
            const privateKey = keys.privateKey;
            
            // Sunucuya yeni public key'i gönder
            try {
                await fetch(`${API.BASE}/api/update-public-key`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: result.userId,
                        publicKey: publicKey,
                    }),
                });
                console.log('[Auth] Public key sunucuya gönderildi');
            } catch (err) {
                console.error('[Auth] Public key güncellenemedi:', err);
            }
            
            console.log('[Auth] Anahtarlar bellekte saklanıyor');
            setKeys(publicKey, privateKey);

            currentSessionUser = {
                userId: result.userId,
                email,
                displayName: result.displayName,
            };

            return {
                success: true,
                userId: result.userId,
                displayName: result.displayName,
            };
        }

        return result;
    } catch (error) {
        console.error('[Auth] Giriş hatası:', error);
        return { success: false, message: 'Bağlantı hatası' };
    }
}

export async function logoutUser() {
    const { clearKeys } = require('../crypto/keyManager');
    await endSession();
    await clearAllSecure();
    clearKeys();
    currentSessionUser = null;
}

export async function getUserList(excludeUserId) {
    try {
        console.log('[Auth] Kullanıcı listesi isteniyor, exclude:', excludeUserId);
        const response = await fetch(`${API.USERS}?exclude=${excludeUserId || 'none'}`);
        const result = await response.json();
        console.log('[Auth] Kullanıcı listesi alındı:', result.users?.length, 'kullanıcı');
        return result.success ? result.users : [];
    } catch (error) {
        console.error('[Auth] Kullanıcı listesi hatası:', error);
        return [];
    }
}

export function getCurrentUser() {
    return currentSessionUser;
}
