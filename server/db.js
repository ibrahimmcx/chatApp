const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'users.db');
const db = new Database(dbPath);

console.log('[DB] SQLite veritabanına bağlanıldı.');

function initDb() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            userId TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            passwordHash TEXT NOT NULL,
            displayName TEXT NOT NULL,
            publicKey TEXT,
            profileImage TEXT,
            createdAt TEXT NOT NULL
        )
    `);
    console.log('[DB] users tablosu hazır.');
}

initDb();

function createUser(user) {
    try {
        const stmt = db.prepare(`
            INSERT INTO users (userId, email, passwordHash, displayName, publicKey, profileImage, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            user.userId,
            user.email,
            user.passwordHash,
            user.displayName,
            user.publicKey || '',
            user.profileImage || '',
            user.createdAt
        );
        
        return { success: true, userId: user.userId };
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return { success: false, message: 'Bu email zaten kayıtlı' };
        }
        throw err;
    }
}

function getUserByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
}

function getUserById(userId) {
    const stmt = db.prepare('SELECT * FROM users WHERE userId = ?');
    return stmt.get(userId);
}

function getAllUsers(excludeId) {
    let query = 'SELECT userId, email, displayName, publicKey, profileImage FROM users';
    let params = [];
    
    if (excludeId && excludeId !== 'none') {
        query += ' WHERE userId != ?';
        params.push(excludeId);
    }

    const stmt = db.prepare(query);
    return stmt.all(...params);
}

function updateUser(userId, displayName, newPasswordHash = null) {
    let query, params;
    if (newPasswordHash) {
        query = 'UPDATE users SET displayName = ?, passwordHash = ? WHERE userId = ?';
        params = [displayName, newPasswordHash, userId];
    } else {
        query = 'UPDATE users SET displayName = ? WHERE userId = ?';
        params = [displayName, userId];
    }

    const stmt = db.prepare(query);
    const info = stmt.run(...params);
    return { success: true, changes: info.changes };
}

function updateUserAvatar(userId, profileImage) {
    const stmt = db.prepare('UPDATE users SET profileImage = ? WHERE userId = ?');
    const info = stmt.run(profileImage, userId);
    return { success: true, changes: info.changes };
}

function getUserCount() {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM users');
    const row = stmt.get();
    return row ? row.count : 0;
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
