import express from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../../database/db.js';

const router = express.Router();
const JWT_SECRET = 'your-secret-key-change-in-production';

// Temporary OTP store (use Redis in production)
const otpStore = new Map();

// Step 1: Request login (send OTP)
router.post('/login', async (req, res) => {
    const { phone } = req.body;
    
    if (!phone) {
        return res.status(400).json({ error: 'Phone number required' });
    }
    
    // Generate OTP (6 digits)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP (expires in 5 minutes)
    otpStore.set(phone, { otp, expires: Date.now() + 300000 });
    
    // TODO: Send OTP via WhatsApp or SMS
    console.log(`📱 OTP for ${phone}: ${otp}`);
    
    // DEV MODE: Return OTP for testing
    res.json({ 
        success: true, 
        message: 'OTP sent',
        dev_otp: otp // Remove in production!
    });
});

// Step 2: Verify OTP
router.post('/verify', async (req, res) => {
    const { phone, otp } = req.body;
    
    const stored = otpStore.get(phone);
    
    if (!stored || stored.otp !== otp || Date.now() > stored.expires) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    
    // Clear OTP
    otpStore.delete(phone);
    
    // Get or create user
    const db = getDb();
    let user = await db.get('SELECT * FROM users WHERE phone = ?', [phone]);
    
    if (!user) {
        // Create new user
        await db.run(
            'INSERT INTO users (phone, username) VALUES (?, ?)',
            [phone, `User_${phone.slice(-4)}`]
        );
        user = await db.get('SELECT * FROM users WHERE phone = ?', [phone]);
    }
    
    // Generate JWT
    const token = jwt.sign(
        { userId: user.id, phone: user.phone },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
    
    res.json({
        success: true,
        token,
        user: {
            id: user.id,
            phone: user.phone,
            username: user.username,
            avatar: user.avatar,
            banner: user.banner
        }
    });
});

// Step 3: Get current user
router.get('/me', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const db = getDb();
        const user = await db.get('SELECT * FROM users WHERE id = ?', [decoded.userId]);
        
        res.json({ user });
    } catch (e) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

export default router;
