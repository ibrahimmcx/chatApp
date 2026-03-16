/**
 * SecureChat Backend Server
 * 
 * Node.js + Express + Socket.IO
 * REST API + Gerçek zamanlı mesajlaşma
 * 
 * Endpoints:
 * - POST /api/register  → Kullanıcı kaydı
 * - POST /api/login     → Kullanıcı girişi
 * - GET  /api/users     → Kullanıcı listesi
 * - GET  /api/health    → Sunucu durumu
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

// Socket.IO - tüm originlerden bağlantıya izin ver
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
    // Mobil bağlantılar için uzun timeout
    pingTimeout: 60000,
    pingInterval: 25000,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Base64 resimler için limit artırıldı

// ══════════════════════════════════════
// VERİ DEPOSU & IN-MEMORY STATE
// ══════════════════════════════════════

// Kullanıcı veritabanı (Kalıcı)
const db = require('./db');

// {userId} → socket mapping (Geçici, RAM'de)
const onlineSockets = new Map();
// Bekleyen mesajlar (çevrimdışı kullanıcılar için, RAM'de)
const pendingMessages = new Map();

// ══════════════════════════════════════
// REST API ENDPOINTS
// ══════════════════════════════════════

/**
 * Sunucu durumu
 */
app.get('/api/health', (req, res) => {
    try {
        const userCount = db.getUserCount();
        res.json({
            status: 'ok',
            server: 'SecureChat Backend v1.1 (SQLite)',
            uptime: Math.floor(process.uptime()),
            users: userCount,
            onlineUsers: onlineSockets.size,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(500).json({ status: 'error' });
    }
});

/**
 * Kullanıcı kaydı
 * Body: { email, passwordHash, displayName, publicKey }
 */
app.post('/api/register', (req, res) => {
    try {
        const { email, passwordHash, displayName, publicKey } = req.body;

        if (!email || !passwordHash || !displayName) {
            return res.status(400).json({
                success: false,
                message: 'Email, şifre ve görünen ad gereklidir',
            });
        }

        const userId = uuidv4();
        const newUser = {
            userId,
            email,
            passwordHash,
            displayName,
            publicKey: publicKey || '',
            profileImage: '',
            createdAt: new Date().toISOString(),
        };

        const result = db.createUser(newUser);
        if (!result.success) {
            return res.status(409).json(result);
        }

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

/**
 * Kullanıcı girişi
 * Body: { email, passwordHash }
 */
app.post('/api/login', (req, res) => {
    try {
        const { email, passwordHash } = req.body;

        if (!email || !passwordHash) {
            return res.status(400).json({
                success: false,
                message: 'Email ve şifre gereklidir',
            });
        }

        const foundUser = db.getUserByEmail(email);

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
            profileImage: foundUser.profileImage,
            message: 'Giriş başarılı',
        });
    } catch (error) {
        console.error('[Login] Hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

/**
 * Kullanıcı listesi
 * Query: ?exclude=userId (kendini listeden çıkar)
 */
app.get('/api/users', (req, res) => {
    try {
        const excludeId = req.query.exclude;
        const dbUsers = db.getAllUsers(excludeId);

        const userList = dbUsers.map(u => ({
            userId: u.userId,
            email: u.email,
            displayName: u.displayName,
            publicKey: u.publicKey,
            profileImage: u.profileImage,
            isOnline: onlineSockets.has(u.userId),
        }));

        res.json({ success: true, users: userList });
    } catch (error) {
        console.error('[Users] Hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

/**
 * Kullanıcı bilgilerini güncelle (isim veya şifre)
 */
app.put('/api/user/update', (req, res) => {
    try {
        const { userId, displayName, passwordHash } = req.body;
        
        if (!userId || !displayName) {
             return res.status(400).json({ success: false, message: 'Gerekli bilgiler eksik' });
        }

        const user = db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
        }

        db.updateUser(userId, displayName, passwordHash);
        console.log(`[Update] Kullanıcı bilgileri güncellendi: ${userId}`);
        
        broadcastUserList();

        res.json({ success: true, message: 'Profil güncellendi' });
    } catch (error) {
        console.error('[Update] Hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

/**
 * Profil resmi yükle/güncelle (Base64)
 */
app.post('/api/user/avatar', (req, res) => {
    try {
        const { userId, imageBase64 } = req.body;
        
        if (!userId || !imageBase64) {
             return res.status(400).json({ success: false, message: 'Resim verisi eksik' });
        }

        db.updateUserAvatar(userId, imageBase64);
        console.log(`[Avatar] Profil resmi güncellendi: ${userId}`);
        
        broadcastUserList();
        
        res.json({ success: true, message: 'Profil resmi güncellendi' });
    } catch (error) {
        console.error('[Avatar] Hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

// ══════════════════════════════════════
// SOCKET.IO - GERÇEK ZAMANLI MESAJLAŞMA
// ══════════════════════════════════════

io.on('connection', (socket) => {
    let currentUserId = null;

    console.log(`[Socket] 🔌 Yeni bağlantı: ${socket.id}`);

    /**
     * Kullanıcı çevrimiçi olduğunu bildirir
     */
    socket.on('user_online', (userId) => {
        currentUserId = userId;
        onlineSockets.set(userId, socket.id);

        // Kullanıcıyı kendi odasına ekle
        socket.join(userId);

        console.log(`[Socket] 🟢 Online: ${userId}`);

        // Tüm kullanıcılara güncel listeyi bildir
        broadcastUserList();

        // Bekleyen mesajları gönder
        deliverPendingMessages(userId, socket);
    });

    /**
     * Şifreli mesaj gönderme
     */
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

            console.log(`[Socket] 📨 Mesaj: ${senderId} → ${receiverId} (${messageId})`);

            // Alıcı çevrimiçi mi?
            const receiverSocketId = onlineSockets.get(receiverId);

            if (receiverSocketId) {
                // Alıcı online → hemen gönder
                io.to(receiverId).emit('new_message', message);
                message.status = 'delivered';

                console.log(`[Socket] ✅ Mesaj teslim edildi: ${messageId}`);
            } else {
                // Alıcı offline → bekleyen mesajlara ekle
                if (!pendingMessages.has(receiverId)) {
                    pendingMessages.set(receiverId, []);
                }
                pendingMessages.get(receiverId).push(message);

                console.log(`[Socket] 💤 Mesaj beklemeye alındı: ${messageId}`);
            }

            // Göndericiye onay
            socket.emit('message_sent', {
                messageId,
                timestamp,
                status: message.status,
            });
        } catch (error) {
            console.error('[Socket] Mesaj gönderme hatası:', error);
            socket.emit('message_error', { error: 'Mesaj gönderilemedi' });
        }
    });

    /**
     * Mesaj okundu bildirimi
     */
    socket.on('message_read', (data) => {
        const { messageId, senderId } = data;

        // Göndericiye "okundu" bilgisi yolla
        const senderSocketId = onlineSockets.get(senderId);
        if (senderSocketId) {
            io.to(senderId).emit('message_status', {
                messageId,
                status: 'read',
            });
        }

        console.log(`[Socket] 👁️ Okundu: ${messageId}`);
    });

    /**
     * Yazıyor... bildirimi
     */
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

    /**
     * Bağlantı kesildiğinde
     */
    socket.on('disconnect', () => {
        if (currentUserId) {
            onlineSockets.delete(currentUserId);
            console.log(`[Socket] 🔴 Offline: ${currentUserId}`);
            broadcastUserList();
        }
    });
});

/**
 * Tüm kullanıcılara güncel online listesini gönder
 */
function broadcastUserList() {
    const onlineIds = Array.from(onlineSockets.keys());
    io.emit('user_list_update', { onlineUsers: onlineIds });
}

/**
 * Çevrimdışıyken gelen mesajları teslim et
 */
function deliverPendingMessages(userId, socket) {
    const pending = pendingMessages.get(userId);
    if (pending && pending.length > 0) {
        console.log(`[Socket] 📬 ${pending.length} bekleyen mesaj teslim ediliyor: ${userId}`);
        pending.forEach((msg) => {
            msg.status = 'delivered';
            socket.emit('new_message', msg);
        });
        pendingMessages.delete(userId);
    }
}

// ══════════════════════════════════════
// SUNUCUYU BAŞLAT
// ══════════════════════════════════════

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
    console.log('════════════════════════════════════════');
    console.log(`🚀 SecureChat Server v1.0`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`🔗 http://localhost:${PORT}`);
    console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
    console.log('════════════════════════════════════════');
});
