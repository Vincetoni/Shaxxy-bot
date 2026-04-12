import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db = null;

export async function initDatabase() {
    db = await open({
        filename: join(__dirname, 'community.db'),
        driver: sqlite3.Database
    });

    // Create tables
    await db.exec(`
        -- Group settings
        CREATE TABLE IF NOT EXISTS group_settings (
            group_id TEXT PRIMARY KEY,
            community_enabled INTEGER DEFAULT 0,
            economy_enabled INTEGER DEFAULT 0,
            welcome_message TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- User stats per group
        CREATE TABLE IF NOT EXISTS user_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            group_id TEXT NOT NULL,
            messages INTEGER DEFAULT 0,
            xp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            money INTEGER DEFAULT 0,
            bank INTEGER DEFAULT 0,
            daily_streak INTEGER DEFAULT 0,
            last_daily DATE,
            last_message DATETIME,
            warnings INTEGER DEFAULT 0,
            commands_used INTEGER DEFAULT 0,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, group_id)
        );

        -- Inventory
        CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            group_id TEXT NOT NULL,
            item_name TEXT NOT NULL,
            quantity INTEGER DEFAULT 1,
            bought_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, group_id, item_name)
        );

        -- Shop items (global)
        CREATE TABLE IF NOT EXISTS shop_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            price INTEGER NOT NULL,
            description TEXT,
            effect TEXT, -- JSON: {"xp_boost": 2, "duration": 3600}
            stock INTEGER DEFAULT -1 -- -1 = unlimited
        );

        -- Message history (for anti-spam)
        CREATE TABLE IF NOT EXISTS message_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            group_id TEXT,
            message_type TEXT,
            xp_gained INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_stats_user ON user_stats(user_id, group_id);
        CREATE INDEX IF NOT EXISTS idx_stats_xp ON user_stats(group_id, xp DESC);
    `);

    // Insert default shop items
    const defaultItems = [
        { name: 'XP Boost', price: 500, description: '2x XP for 1 hour', effect: '{"xp_multiplier": 2, "duration": 3600}' },
        { name: 'Lucky Charm', price: 1000, description: 'Better daily rewards', effect: '{"daily_bonus": 100}' },
        { name: 'Shield', price: 2000, description: 'Protection from warnings', effect: '{"warning_immunity": 1}' },
        { name: 'VIP Badge', price: 5000, description: 'Shows VIP status', effect: '{"badge": "VIP"}' }
    ];

    for (const item of defaultItems) {
        await db.run(`
            INSERT OR IGNORE INTO shop_items (name, price, description, effect) 
            VALUES (?, ?, ?, ?)
        `, [item.name, item.price, item.description, item.effect]);
    }

    console.log('✅ Database initialized');
    return db;
}

export function getDb() {
    if (!db) throw new Error('Database not initialized');
    return db;
}

// Helper functions
export async function getUserStats(userId, groupId) {
    const db = getDb();
    let stats = await db.get(
        'SELECT * FROM user_stats WHERE user_id = ? AND group_id = ?',
        [userId, groupId]
    );
    
    if (!stats) {
        await db.run(
            'INSERT INTO user_stats (user_id, group_id) VALUES (?, ?)',
            [userId, groupId]
        );
        stats = await db.get(
            'SELECT * FROM user_stats WHERE user_id = ? AND group_id = ?',
            [userId, groupId]
        );
    }
    
    return stats;
}

export async function updateUserStats(userId, groupId, updates) {
    const db = getDb();
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), userId, groupId];
    
    await db.run(
        `UPDATE user_stats SET ${fields} WHERE user_id = ? AND group_id = ?`,
        values
    );
}

export async function addXp(userId, groupId, amount) {
    const db = getDb();
    const stats = await getUserStats(userId, groupId);
    const newXp = stats.xp + amount;
    const newLevel = calculateLevel(newXp);
    
    await db.run(
        'UPDATE user_stats SET xp = ?, level = ? WHERE user_id = ? AND group_id = ?',
        [newXp, newLevel, userId, groupId]
    );
    
    return { leveledUp: newLevel > stats.level, newLevel, newXp };
}

export async function getLeaderboard(groupId, limit = 10) {
    const db = getDb();
    return await db.all(
        `SELECT user_id, level, xp, messages, money, 
                RANK() OVER (ORDER BY xp DESC) as rank
         FROM user_stats 
         WHERE group_id = ?
         ORDER BY xp DESC 
         LIMIT ?`,
        [groupId, limit]
    );
}

export async function isCommunityEnabled(groupId) {
    const db = getDb();
    const setting = await db.get(
        'SELECT community_enabled FROM group_settings WHERE group_id = ?',
        [groupId]
    );
    return setting?.community_enabled === 1;
}

export async function toggleCommunity(groupId, enabled) {
    const db = getDb();
    await db.run(`
        INSERT INTO group_settings (group_id, community_enabled) 
        VALUES (?, ?)
        ON CONFLICT(group_id) DO UPDATE SET community_enabled = ?
    `, [groupId, enabled ? 1 : 0, enabled ? 1 : 0]);
}