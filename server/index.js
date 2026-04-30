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
const onlineSockets = new Map(); // userId -> Set(socket.id)
const pendingMessages = new Map(); // userId -> [messages]

// ══════════════════════════════════════
// REST API
// ══════════════════════════════════════

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        server: 'SecureChat Backend v2.0 (In-Memory)',
        uptime: Math.floor(process.uptime()),
        users: users.size,
        onlineUsers: onlineSockets.size,
        timestamp: new Date().toISOString(),
    });
});

app.post('/api/register', (req, res) => {
    try {
        const { email, passwordHash, displayName, publicKey } = req.body;

        if (!email || !passwordHash || !displayName) {
            return res.status(400).json({
                success: false,
                message: 'Email, şifre ve görünen ad gereklidir',
            });
        }

        // Email kontrolü
        for (let user of users.values()) {
            if (user.email === email) {
                return res.status(409).json({
                    success: false,
                    message: 'Bu email zaten kayıtlı',
                });
            }
        }

        const userId = uuidv4();
        users.set(userId, {
            userId,
            email,
            passwordHash,
            displayName,
            publicKey: publicKey || '',
        });

        console.log(`[Register] ✅ Yeni kullanıcı: ${displayName} (${email})`);

        res.status(201).json({
            success: true,
            userId,
            message: 'Kayıt başarılı',
        });
    } catch (error) {
        console.error('[Register] Hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

app.post('/api/login', (req, res) => {
    try {
        const { email, passwordHash } = req.body;

        if (!email || !passwordHash) {
            return res.status(400).json({
                success: false,
                message: 'Email ve şifre gereklidir',
            });
        }

        let foundUser = null;
        for (let user of users.values()) {
            if (user.email === email) {
                foundUser = user;
                break;
            }
        }

        if (!foundUser) {
            return res.status(401).json({
                success: false,
                message: 'Kullanıcı bulunamadı',
            });
        }

        if (foundUser.passwordHash !== passwordHash) {
            return res.status(401).json({
                success: false,
                message: 'Hatalı şifre',
            });
        }

        console.log(`[Login] ✅ Giriş: ${foundUser.displayName} (${email})`);

        res.json({
            success: true,
            userId: foundUser.userId,
            displayName: foundUser.displayName,
            message: 'Giriş başarılı',
        });
    } catch (error) {
        console.error('[Login] Hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

app.get('/api/users', (req, res) => {
    try {
        const excludeId = req.query.exclude;
        const userList = [];

        for (let user of users.values()) {
            if (user.userId !== excludeId) {
                userList.push({
                    userId: user.userId,
                    email: user.email,
                    displayName: user.displayName,
                    publicKey: user.publicKey,
                    isOnline: onlineSockets.has(user.userId),
                });
            }
        }

        res.json({ success: true, users: userList });
    } catch (error) {
        console.error('[Users] Hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

app.post('/api/update-public-key', (req, res) => {
    try {
        const { userId, publicKey } = req.body;

        if (!userId || !publicKey) {
            return res.status(400).json({
                success: false,
                message: 'userId ve publicKey gereklidir',
            });
        }

        const user = users.get(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı',
            });
        }

        user.publicKey = publicKey;
        users.set(userId, user);

        console.log(`[UpdateKey] ✅ Public key güncellendi: ${user.displayName}`);

        res.json({
            success: true,
            message: 'Public key güncellendi',
        });
    } catch (error) {
        console.error('[UpdateKey] Hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

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

    socket.on('debug_encryption', (data) => {
        if (currentUserId) {
            socket.to(currentUserId).emit('encryption_step', data);
        }
    });

    socket.on('send_message', (data) => {
        try {
            const {
                messageId: clientMessageId,
                senderId,
                receiverId,
                encryptedMessage,
                encryptedAESKey,
                iv,
                selfDestruct,
                selfDestructTime,
            } = data;

            const messageId = clientMessageId || uuidv4();
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

            if (onlineSockets.has(receiverId)) {
                io.to(receiverId).emit('new_message', message);
                message.status = 'delivered';
            } else {
                if (!pendingMessages.has(receiverId)) {
                    pendingMessages.set(receiverId, []);
                }
                pendingMessages.get(receiverId).push(message);
            }

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
        pending.forEach((msg) => {
            msg.status = 'delivered';
            socket.emit('new_message', msg);
        });
        pendingMessages.delete(userId);
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SecureChat Server v2.0 on Port: ${PORT}`);
});
