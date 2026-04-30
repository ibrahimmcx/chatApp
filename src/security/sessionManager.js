/**
 * Oturum Yönetimi
 */

import { saveSecure, getSecure, deleteSecure } from '../storage/secureStorage';

const SESSION_TOKEN_KEY = 'session_token';
const LAST_ACTIVITY_KEY = 'last_activity';
const USER_ID_KEY = 'user_id';
const USER_EMAIL_KEY = 'user_email';
const DEFAULT_TIMEOUT = 15 * 60 * 1000;

let sessionCheckInterval = null;
let onSessionExpiredCallback = null;

export async function startSession(token, userId, email) {
    try {
        await saveSecure(SESSION_TOKEN_KEY, token);
        await saveSecure(USER_ID_KEY, userId);
        await saveSecure(USER_EMAIL_KEY, email);
        await updateLastActivity();
        console.log('[Session] Oturum başlatıldı');
    } catch (error) {
        console.error('[Session] Hata:', error);
        throw error;
    }
}

export async function updateLastActivity() {
    const now = Date.now().toString();
    await saveSecure(LAST_ACTIVITY_KEY, now);
}

export async function checkSessionValidity() {
    try {
        const lastActivity = await getSecure(LAST_ACTIVITY_KEY);
        if (!lastActivity) return false;

        const now = Date.now();
        const diff = now - parseInt(lastActivity);
        return diff < DEFAULT_TIMEOUT;
    } catch (error) {
        return false;
    }
}

export async function endSession() {
    await deleteSecure(SESSION_TOKEN_KEY);
    await deleteSecure(USER_ID_KEY);
    await deleteSecure(USER_EMAIL_KEY);
    await deleteSecure(LAST_ACTIVITY_KEY);
    stopSessionMonitor();
}

export function startSessionMonitor(onExpired) {
    onSessionExpiredCallback = onExpired;
    sessionCheckInterval = setInterval(async () => {
        const isValid = await checkSessionValidity();
        if (!isValid && onSessionExpiredCallback) {
            onSessionExpiredCallback();
        }
    }, 60000);
}

export function stopSessionMonitor() {
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        sessionCheckInterval = null;
    }
}
