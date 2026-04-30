/**
 * WebSocket Mesajlaşma Servisi
 */

import io from 'socket.io-client';
import { SERVER_URL } from '../config';
import { generateUUID } from '../utils/helpers';

let socket = null;
let messageListeners = {};
let statusListeners = {};
let connectionListeners = [];
let isConnected = false;

export function connectSocket(userId) {
    try {
        if (socket) {
            socket.disconnect();
        }

        console.log('[Socket] Bağlantı kuruluyor...', SERVER_URL);

        socket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });

        socket.on('connect', () => {
            isConnected = true;
            console.log('[Socket] ✅ Bağlandı');
            socket.emit('user_online', userId);
            connectionListeners.forEach(cb => cb(true));
        });

        socket.on('disconnect', (reason) => {
            isConnected = false;
            console.log('[Socket] ❌ Bağlantı kesildi');
            connectionListeners.forEach(cb => cb(false));
        });

        socket.on('reconnect', (attemptNumber) => {
            console.log('[Socket] 🔄 Yeniden bağlandı');
            socket.emit('user_online', userId);
        });

        socket.on('new_message', (message) => {
            console.log('[Socket] 📩 Yeni mesaj');
            handleIncomingMessage(message);
        });

        socket.on('message_sent', (data) => {
            console.log('[Socket] ✅ Mesaj gönderildi');
        });

        socket.on('message_status', (data) => {
            handleMessageStatus(data);
        });

    } catch (error) {
        console.error('[Socket] Bağlantı hatası:', error);
    }
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    isConnected = false;
}

export function isSocketConnected() {
    return isConnected;
}

export function sendEncryptedMessage(messageData) {
    try {
        if (!socket || !isConnected) {
            return {
                success: false,
                error: 'Sunucuya bağlı değil',
            };
        }

        const messageId = generateUUID();
        const timestamp = new Date().toISOString();

        socket.emit('send_message', {
            senderId: messageData.senderId,
            receiverId: messageData.receiverId,
            encryptedMessage: messageData.encryptedMessage,
            encryptedAESKey: messageData.encryptedAESKey,
            iv: messageData.iv,
            selfDestruct: messageData.selfDestruct || false,
            selfDestructTime: messageData.selfDestructTime || 0,
        });

        return {
            success: true,
            messageId,
            timestamp,
            status: 'sent',
        };
    } catch (error) {
        console.error('[Socket] Mesaj gönderme hatası:', error);
        return {
            success: false,
            error: 'Mesaj gönderilemedi',
        };
    }
}

export function emitDebugLog(data) {
    if (socket && isConnected) {
        socket.emit('debug_encryption', data);
    }
}

function handleIncomingMessage(message) {
    const chatId = getChatId(message.senderId, message.receiverId);
    console.log('[Socket] Mesaj işleniyor, chatId:', chatId);
    console.log('[Socket] Kayıtlı listener\'lar:', Object.keys(messageListeners));
    
    if (messageListeners[chatId]) {
        console.log('[Socket] Listener bulundu, callback çağrılıyor');
        messageListeners[chatId].forEach(callback => callback(message));
    } else {
        console.warn('[Socket] Bu chatId için listener yok:', chatId);
    }
}

function handleMessageStatus(data) {
    Object.keys(statusListeners).forEach(chatId => {
        if (statusListeners[chatId]) {
            statusListeners[chatId].forEach(callback => callback(data.messageId, data.status));
        }
    });
}

export function markMessagesAsRead(chatId, userId) {
    if (socket && isConnected) {
        const ids = chatId.split('_');
        const senderId = ids.find(id => id !== userId);
        if (senderId) {
            socket.emit('message_read', { chatId, senderId });
        }
    }
}

export function getChatId(userId1, userId2) {
    return [userId1, userId2].sort().join('_');
}

export function addMessageListener(chatId, callback) {
    if (!messageListeners[chatId]) {
        messageListeners[chatId] = [];
    }
    messageListeners[chatId].push(callback);
}

export function removeMessageListener(chatId, callback) {
    if (messageListeners[chatId]) {
        messageListeners[chatId] = messageListeners[chatId].filter(cb => cb !== callback);
    }
}

export function addStatusListener(chatId, callback) {
    if (!statusListeners[chatId]) {
        statusListeners[chatId] = [];
    }
    statusListeners[chatId].push(callback);
}

export function addConnectionListener(callback) {
    connectionListeners.push(callback);
    return () => {
        connectionListeners = connectionListeners.filter(cb => cb !== callback);
    };
}
