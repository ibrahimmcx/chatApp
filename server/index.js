/**
 * SecureChat Backend Server - Basitleştirilmiş Versiyon
 * Veritabanı yok, sadece RAM'de kullanıcı tutma
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// RAM'de kullanıcı deposu
const users = new Map(); // userId -> {userId, email, passwordHash, displayName, publicKey}
const onlineSockets = new Map(); // userId -> Set(socket.id) (Çoklu cihaz desteği)
const pendingMessages = new Map(); // userId -> [messages]

// ... (REST API kısımları aynı kalıyor)

// ══════════════════════════════════════
// SOCKET.IO
// ══════════════════════════════════════

io.on('connection', (socket) => {
    let currentUserId = null;

    console.log(`[Socket] 🔌 Yeni bağlantı: ${socket.id}`);

    socket.on('user_online', (userId) => {
        currentUserId = userId;
        
        if (!onlineSockets.has(userId)) {
            onlineSockets.set(userId, new Set());
        }
        onlineSockets.get(userId).add(socket.id);
        
        socket.join(userId);

        console.log(`[Socket] 🟢 Online: ${userId} (Cihaz sayısı: ${onlineSockets.get(userId).size})`);
        broadcastUserList();
        deliverPendingMessages(userId, socket);
    });

    // Web görselleştirme için şifreleme loglarını alıp o kullanıcıya ait diğer cihazlara (web'e) ilet
    socket.on('debug_encryption', (data) => {
        if (currentUserId) {
            // Sadece bu kullanıcının "web" cihazlarına bu logu gönder
            socket.to(currentUserId).emit('encryption_step', data);
        }
    });

    socket.on('send_message', (data) => {
        try {
            const {
                senderId,
                receiverId,
                encryptedMessage,
                encryptedAESKey,
                iv,
                selfDestruct,
                selfDestructTime,
            } = data;

            const messageId = uuidv4();
            const timestamp = new Date().toISOString();

            const message = {
                messageId,
                senderId,
                receiverId,
                encryptedMessage,
                encryptedAESKey,
                iv,
                timestamp,
                status: 'sent',
                selfDestruct: selfDestruct || false,
                selfDestructTime: selfDestructTime || 0,
            };

            console.log(`[Socket] 📨 Mesaj: ${senderId} → ${receiverId}`);

            // Alıcının TÜM cihazlarına gönder
            if (onlineSockets.has(receiverId)) {
                io.to(receiverId).emit('new_message', message);
                message.status = 'delivered';
                console.log(`[Socket] ✅ Mesaj alıcıya iletildi`);
            } else {
                if (!pendingMessages.has(receiverId)) {
                    pendingMessages.set(receiverId, []);
                }
                pendingMessages.get(receiverId).push(message);
                console.log(`[Socket] 💤 Alıcı offline, mesaj beklemeye alındı`);
            }

            // Gönderenin DİĞER cihazlarına da (web gibi) gönder ki senkronize olsunlar
            socket.to(senderId).emit('new_message', message);

            socket.emit('message_sent', {
                messageId,
                timestamp,
                status: message.status,
            });
        } catch (error) {
            console.error('[Socket] Mesaj hatası:', error);
            socket.emit('message_error', { error: 'Mesaj gönderilemedi' });
        }
    });

    socket.on('message_read', (data) => {
        const { senderId } = data;
        if (onlineSockets.has(senderId)) {
            io.to(senderId).emit('message_status', {
                messageId: data.messageId,
                status: 'read',
            });
        }
    });

    socket.on('typing', (data) => {
        const { receiverId, isTyping } = data;
        if (onlineSockets.has(receiverId)) {
            io.to(receiverId).emit('user_typing', {
                userId: currentUserId,
                isTyping,
            });
        }
    });

    socket.on('disconnect', () => {
        if (currentUserId && onlineSockets.has(currentUserId)) {
            const userSockets = onlineSockets.get(currentUserId);
            userSockets.delete(socket.id);
            
            if (userSockets.size === 0) {
                onlineSockets.delete(currentUserId);
                console.log(`[Socket] 🔴 Tamamen Offline: ${currentUserId}`);
            } else {
                console.log(`[Socket] 📉 Bir cihaz ayrıldı, kalan: ${userSockets.size}`);
            }
            broadcastUserList();
        }
    });
});

function broadcastUserList() {
    const onlineIds = Array.from(onlineSockets.keys());
    io.emit('user_list_update', { onlineUsers: onlineIds });
}

function deliverPendingMessages(userId, socket) {
    const pending = pendingMessages.get(userId);
    if (pending && pending.length > 0) {
        console.log(`[Socket] 📬 ${pending.length} bekleyen mesaj teslim ediliyor`);
        pending.forEach((msg) => {
            msg.status = 'delivered';
            socket.emit('new_message', msg);
        });
        pendingMessages.delete(userId);
    }
}

// ══════════════════════════════════════
// SUNUCU BAŞLAT
// ══════════════════════════════════════

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
    console.log('════════════════════════════════════════');
    console.log(`🚀 SecureChat Server v2.0 (In-Memory)`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`🔗 http://localhost:${PORT}`);
    console.log('════════════════════════════════════════');
});
