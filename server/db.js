const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Veritabanı dosyasına bağlan
const dbPath = path.resolve(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('[DB] Veritabanı bağlantı hatası:', err.message);
    } else {
        console.log('[DB] SQLite veritabanına bağlanıldı.');
        initDb();
    }
});

// Tabloları oluştur
function initDb() {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            userId TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            passwordHash TEXT NOT NULL,
            displayName TEXT NOT NULL,
            publicKey TEXT,
            profileImage TEXT,
            createdAt TEXT NOT NULL
        )
    `, (err) => {
        if (err) {
            console.error('[DB] users tablosu oluşturulamadı:', err.message);
        } else {
            console.log('[DB] users tablosu hazır.');
        }
    });
}

/**
 * Kullanıcıyı veritabanına ekler
 */
function createUser(user) {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO users (userId, email, passwordHash, displayName, publicKey, profileImage, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            user.userId,
            user.email,
            user.passwordHash,
            user.displayName,
            user.publicKey || '',
            user.profileImage || '',
            user.createdAt
        ];

        db.run(query, params, function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    resolve({ success: false, message: 'Bu email zaten kayıtlı' });
                } else {
                    reject(err);
                }
            } else {
                resolve({ success: true, userId: user.userId });
            }
        });
    });
}

/**
 * Email'e göre kullanıcıyı bulur
 */
function getUserByEmail(email) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

/**
 * ID'ye göre kullanıcıyı bulur
 */
function getUserById(userId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE userId = ?', [userId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

/**
 * Tüm kullanıcıları getirir (belirtilen ID hariç)
 */
function getAllUsers(excludeId) {
    return new Promise((resolve, reject) => {
        let query = 'SELECT userId, email, displayName, publicKey, profileImage FROM users';
        let params = [];
        
        if (excludeId && excludeId !== 'none') {
            query += ' WHERE userId != ?';
            params.push(excludeId);
        }

        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

/**
 * Kullanıcı adını ve şifresini günceller
 */
function updateUser(userId, displayName, newPasswordHash = null) {
    return new Promise((resolve, reject) => {
        let query, params;
        if (newPasswordHash) {
            query = 'UPDATE users SET displayName = ?, passwordHash = ? WHERE userId = ?';
            params = [displayName, newPasswordHash, userId];
        } else {
            query = 'UPDATE users SET displayName = ? WHERE userId = ?';
            params = [displayName, userId];
        }

        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve({ success: true, changes: this.changes });
        });
    });
}

/**
 * Kullanıcı profil resmini günceller
 */
function updateUserAvatar(userId, profileImage) {
    return new Promise((resolve, reject) => {
        db.run('UPDATE users SET profileImage = ? WHERE userId = ?', [profileImage, userId], function (err) {
            if (err) reject(err);
            else resolve({ success: true, changes: this.changes });
        });
    });
}

/**
 * Toplam kullanıcı sayısını getirir
 */
function getUserCount() {
     return new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.count : 0);
        });
    });
}

module.exports = {
    createUser,
    getUserByEmail,
    getUserById,
    getAllUsers,
    updateUser,
    updateUserAvatar,
    getUserCount
};
