import express from 'express';
import { getDb } from '../../database/db.js';

const router = express.Router();

// Bot status (public)
router.get('/status', (req, res) => {
    res.json({
        status: 'online',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        platform: 'Railway'
    });
});

// Bot stats (admin only)
router.get('/stats', async (req, res) => {
    try {
        const db = getDb();
        
        const totalUsers = await db.get('SELECT COUNT(DISTINCT user_id) as count FROM user_stats');
        const totalGroups = await db.get('SELECT COUNT(*) as count FROM group_settings');
        const totalMessages = await db.get('SELECT SUM(messages) as count FROM user_stats');
        const activeToday = await db.get(`
            SELECT COUNT(DISTINCT user_id) as count 
            FROM message_log 
            WHERE timestamp > datetime('now', '-1 day')
        `);
        
        res.json({
            users: totalUsers.count,
            groups: totalGroups.count,
            messages: totalMessages.count || 0,
            activeToday: activeToday.count,
            uptime: process.uptime()
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Real-time logs (last 100)
router.get('/logs', async (req, res) => {
    try {
        const db = getDb();
        const logs = await db.all(`
            SELECT * FROM message_log 
            ORDER BY timestamp DESC 
            LIMIT 100
        `);
        res.json({ logs });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Group list with settings
router.get('/groups', async (req, res) => {
    try {
        const db = getDb();
        const groups = await db.all('SELECT * FROM group_settings');
        res.json({ groups });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;