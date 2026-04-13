import express from 'express';
import { getDb, getUserStats } from '../../database/db.js';

const router = express.Router();

// Get user profile
router.get('/profile', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    
    try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, 'your-secret-key-change-in-production');
        
        const db = getDb();
        const user = await db.get('SELECT * FROM users WHERE id = ?', [decoded.userId]);
        const stats = await getUserStats(decoded.userId + '@s.whatsapp.net', 'global');
        
        res.json({ user, stats });
    } catch (e) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Get user stats for specific group
router.get('/stats/:groupId', async (req, res) => {
    const { groupId } = req.params;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'No token' });
    
    try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, 'your-secret-key-change-in-production');
        
        const stats = await getUserStats(decoded.userId + '@s.whatsapp.net', groupId);
        res.json({ stats });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get inventory
router.get('/inventory', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    
    try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, 'your-secret-key-change-in-production');
        
        const db = getDb();
        const items = await db.all(
            'SELECT * FROM inventory WHERE user_id = ?',
            [decoded.userId + '@s.whatsapp.net']
        );
        
        res.json({ inventory: items });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;