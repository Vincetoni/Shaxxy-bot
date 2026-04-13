import express from 'express';
import { getDb } from '../../database/db.js';

const router = express.Router();

// Get system logs
router.get('/logs', async (req, res) => {
    try {
        const db = getDb();
        const logs = await db.all(
            'SELECT * FROM message_log ORDER BY timestamp DESC LIMIT 100'
        );
        res.json({ logs });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get bot status
router.get('/status', (req, res) => {
    res.json({ 
        status: 'online',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Get all groups
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