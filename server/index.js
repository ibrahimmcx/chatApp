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
const onlineSockets = new Map(); // userId -> socket.id
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

// ══════════════════════════════════════
// SOCKET.IO
// ══════════════════════════════════════

io.on('connection', (socket) => {
    let currentUserId = null;

    console.log(`[Socket] 🔌 Yeni bağlantı: ${socket.id}`);

    socket.on('user_online', (userId) => {
        currentUserId = userId;
        onlineSockets.set(userId, socket.id);
        socket.join(userId);

        console.log(`[Socket] 🟢 Online: ${userId}`);
        broadcastUserList();
        deliverPendingMessages(userId, socket);
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

            const receiverSocketId = onlineSockets.get(receiverId);

            if (receiverSocketId) {
                io.to(receiverId).emit('new_message', message);
                message.status = 'delivered';
                console.log(`[Socket] ✅ Mesaj teslim edildi`);
            } else {
                if (!pendingMessages.has(receiverId)) {
                    pendingMessages.set(receiverId, []);
                }
                pendingMessages.get(receiverId).push(message);
                console.log(`[Socket] 💤 Mesaj beklemeye alındı`);
            }

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
        const senderSocketId = onlineSockets.get(senderId);
        if (senderSocketId) {
            io.to(senderId).emit('message_status', {
                messageId: data.messageId,
                status: 'read',
            });
        }
    });

    socket.on('typing', (data) => {
        const { receiverId, isTyping } = data;
        const receiverSocketId = onlineSockets.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverId).emit('user_typing', {
                userId: currentUserId,
                isTyping,
            });
        }
    });

    socket.on('disconnect', () => {
        if (currentUserId) {
            onlineSockets.delete(currentUserId);
            console.log(`[Socket] 🔴 Offline: ${currentUserId}`);
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
