/**
 * Güvenli Depolama
 */

import * as SecureStore from 'expo-secure-store';

export async function saveSecure(key, value) {
    try {
        await SecureStore.setItemAsync(key, value);
    } catch (error) {
        console.error('[SecureStore] Kaydetme hatası:', error);
        throw error;
    }
}

export async function getSecure(key) {
    try {
        return await SecureStore.getItemAsync(key);
    } catch (error) {
        console.error('[SecureStore] Okuma hatası:', error);
        return null;
    }
}

export async function deleteSecure(key) {
    try {
        await SecureStore.deleteItemAsync(key);
    } catch (error) {
        console.error('[SecureStore] Silme hatası:', error);
    }
}

export async function clearAllSecure() {
    const keys = ['session_token', 'last_activity', 'user_id', 'user_email', 'private_key', 'public_key'];
    for (const key of keys) {
        await deleteSecure(key);
    }
}
