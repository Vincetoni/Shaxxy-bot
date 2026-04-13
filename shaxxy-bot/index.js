import { 
    default as makeWASocket, 
    DisconnectReason, 
    useMultiFileAuthState,
    fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';  // ✅ FIXED: Import from 'cors', not 'jsonwebtoken'
import jwt from 'jsonwebtoken';  // ✅ JWT is separate
import { initDatabase, getDb, getUserStats } from './database/db.js';
import authRoutes from './server/routes/auth.js';
import userRoutes from './server/routes/user.js';
import adminRoutes from './server/routes/admin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ========== CONFIG ==========
const config = {
    prefix: '!',
    ownerNumber: ['09135716534@s.whatsapp.net'],
    antiNuke: true,
    antiBug: true,
    maxWarnings: 3,
    ignoredGroups: []
};

// ========== GLOBAL STORES ==========
const commands = new Map();
const cooldowns = new Map();
const warnings = new Map();
const xpCooldowns = new Map();


// ========== START EXPRESS SERVER ==========
async function startServer() {
    const app = express();
    
    // ✅ FIXED: Allow ALL localhost ports for development
    app.use(cors({
        origin: (origin, callback) => {
            // Allow no origin (mobile apps, curl)
            if (!origin) return callback(null, true);
            
            // Allow localhost any port
            if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
                return callback(null, true);
            }
            
            // Allow Vercel domains
            if (origin.includes('vercel.app')) {
                return callback(null, true);
            }
            
            callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));
    
    app.use(express.json());
    
    // Health check
    app.get('/', (req, res) => {
        res.json({
            name: 'SHAXXY BOT API',
            version: '1.0.0',
            status: 'online',
            endpoints: {
                auth: '/api/auth',
                user: '/api/user',
                admin: '/api/admin',
                bot: '/api/bot'
            }
        });
    });
    
    // API routes
    app.use('/api/auth', authRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/bot', (await import('./server/routes/bot.js')).default); // Bot monitoring
    
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🌐 Server running on port ${PORT}`);
    });
}

// ========== AUTO-REPLY ==========
function getAutoReply(text, userName) {
    const lower = text.toLowerCase();
    if (lower.includes('who made you')) return `🤍 Created by *ShaxxyDev*!`;
    if (lower.includes('your name')) return `🤍 I'm *L-U-C-A*!`;
    if (lower.includes('hello') || lower.includes('hi')) return `👋 Hello ${userName}!`;
    if (lower.includes('help')) return `🆘 Use *!menu* for commands!`;
    return null;
}

// ========== LOAD COMMANDS ==========
async function loadCommands() {
    const files = readdirSync(join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
    for (const file of files) {
        try {
            const fileUrl = 'file://' + (process.platform === 'win32' ? '/' : '') + 
                           join(__dirname, 'commands', file).replace(/\\/g, '/');
            const mod = await import(fileUrl);
            if (mod.default?.name) {
                commands.set(mod.default.name, mod.default);
                console.log(`✅ ${mod.default.name}`);
            }
        } catch (e) {
            console.log(`❌ ${file}: ${e.message}`);
        }
    }
    console.log(`\n📊 ${commands.size} commands loaded`);
}

// ========== XP HANDLER ==========
async function handleXP(sock, msg, chatId, sender) {
    try {
        const db = getDb();
        const setting = await db.get(
            'SELECT community_enabled FROM group_settings WHERE group_id = ?',
            [chatId]
        );
        if (!setting || setting.community_enabled !== 1) return null;
        
        const key = `${sender}:${chatId}`;
        const lastXP = xpCooldowns.get(key) || 0;
        const now = Date.now();
        if (now - lastXP < 60000) return null;
        
        let xpGain = Math.floor(Math.random() * 5) + 1;
        const hasMedia = msg.message?.imageMessage || msg.message?.videoMessage;
        if (hasMedia) xpGain += 2;
        
        const stats = await getUserStats(sender, chatId);
        const newXP = stats.xp + xpGain;
        const newLevel = calculateLevel(newXP);
        
        await db.run(
            `UPDATE user_stats SET xp = ?, level = ?, messages = messages + 1, last_message = ? 
             WHERE user_id = ? AND group_id = ?`,
            [newXP, newLevel, new Date().toISOString(), sender, chatId]
        );
        
        xpCooldowns.set(key, now);
        
        if (newLevel > stats.level) {
            const { getLevelTitle } = await import('./utils/levels.js');
            return { leveledUp: true, newLevel, title: getLevelTitle(newLevel) };
        }
        return { xpGained: xpGain, leveledUp: false };
    } catch (e) {
        return null;
    }
}

function calculateLevel(xp) {
    if (xp < 100) return 1;
    if (xp < 300) return 2;
    if (xp < 800) return 5;
    if (xp < 2000) return 10;
    if (xp < 5000) return 20;
    if (xp < 15000) return 50;
    if (xp < 40000) return 100;
    if (xp < 100000) return 200;
    if (xp < 300000) return 500;
    return 1000;
}

// ========== PROTECTION ==========
class GroupProtection {
    constructor(sock) {
        this.sock = sock;
        this.spamTracker = new Map();
        this.bannedPatterns = [
            /[\u200B-\u200D\uFEFF]/g,
            /(.)\1{50,}/g,
            /[\u0300-\u036F]{10,}/g,
        ];
    }

    async isAdmin(groupId, userId) {
        try {
            const meta = await this.sock.groupMetadata(groupId);
            return meta.participants.some(p => p.id === userId && p.admin);
        } catch { return false; }
    }

    isOwner(userId) {
        return config.ownerNumber.includes(userId);
    }

    checkSpam(userId) {
        const now = Date.now();
        const data = this.spamTracker.get(userId) || { messages: [] };
        data.messages = data.messages.filter(t => now - t < 5000);
        data.messages.push(now);
        this.spamTracker.set(userId, data);
        return data.messages.length > 5;
    }

    detectBug(msg) {
        const text = msg.conversation || msg.extendedTextMessage?.text || '';
        for (const p of this.bannedPatterns) if (p.test(text)) return 'MALICIOUS_TEXT';
        if (text.length > 5000) return 'MESSAGE_TOO_LONG';
        const mentions = msg.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentions.length > 50) return 'MASS_MENTION';
        return false;
    }

    async takeAction(groupId, userId, reason) {
        if (this.isOwner(userId)) return;
        const key = `${groupId}:${userId}`;
        const count = (warnings.get(key) || 0) + 1;
        warnings.set(key, count);
        
        if (count >= config.maxWarnings) {
            await this.sock.groupParticipantsUpdate(groupId, [userId], 'remove');
            await this.sock.sendMessage(groupId, { 
                text: `🛡️ @${userId.split('@')[0]} removed for ${reason}`,
                mentions: [userId]
            });
            warnings.delete(key);
        } else {
            await this.sock.sendMessage(groupId, { 
                text: `⚠️ Warning ${count}/3: @${userId.split('@')[0]} - ${reason}`,
                mentions: [userId]
            });
        }
    }
}

// ========== START BOT ==========
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        browser: ['LUCA-Bot', 'Chrome', '1.0.0']
    });

    const protection = new GroupProtection(sock);

    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
        if (qr) qrcode.generate(qr, { small: true });
        if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
            startBot();
        } else if (connection === 'open') {
            console.log('✅ Bot connected!');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        const chatId = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        
        let text = msg.message?.conversation || 
                   msg.message?.extendedTextMessage?.text ||
                   msg.message?.imageMessage?.caption || '';
        
        console.log('\n📩', chatId, ':', text.substring(0, 30));

        if (config.ignoredGroups.includes(chatId)) {
            if (!text.startsWith(config.prefix + 'ignore')) return;
        }

        if (isGroup && (config.antiNuke || config.antiBug)) {
            if (protection.checkSpam(sender)) {
                return protection.takeAction(chatId, sender, 'SPAM');
            }
            const bug = protection.detectBug(msg.message);
            if (bug) return protection.takeAction(chatId, sender, bug);
        }

        // XP Tracking
        if (isGroup) {
            const xpResult = await handleXP(sock, msg, chatId, sender);
            if (xpResult?.leveledUp) {
                await sock.sendMessage(chatId, {
                    text: `🎉 @${sender.split('@')[0]} leveled up to ${xpResult.newLevel} (${xpResult.title})!`,
                    mentions: [sender]
                });
            }
        }

        // Auto-reply
        const botNumber = sock.user?.id?.split(':')[0];
        const isTagged = text.includes(`@${botNumber}`);
        const isReplyToBot = msg.message?.extendedTextMessage?.contextInfo?.participant === sock.user?.id;
        
        if ((isTagged || isReplyToBot) && !text.startsWith(config.prefix)) {
            const cleanText = text.replace(`@${botNumber}`, '').trim();
            const reply = getAutoReply(cleanText, msg.pushName || 'Friend');
            if (reply) {
                await sock.sendMessage(chatId, { text: reply, quoted: msg });
                return;
            }
        }

        // Commands
        if (!text.startsWith(config.prefix)) return;
        
        const args = text.slice(config.prefix.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        
        const cmd = commands.get(cmdName);
        if (!cmd) return;

        if (cmd.adminOnly && !(await protection.isAdmin(chatId, sender))) {
            return sock.sendMessage(chatId, { text: '❌ Admin only' });
        }
        if (cmd.ownerOnly && !protection.isOwner(sender)) {
            return sock.sendMessage(chatId, { text: '❌ Owner only' });
        }
        if (cmd.groupOnly && !isGroup) {
            return sock.sendMessage(chatId, { text: '❌ Group only' });
        }

        try {
            await cmd.execute(sock, msg, args, { chatId, sender, isGroup, protection, config, commands });
            if (isGroup) {
                const db = getDb();
                await db.run(
                    'UPDATE user_stats SET commands_used = commands_used + 1 WHERE user_id = ? AND group_id = ?',
                    [sender, chatId]
                );
            }
        } catch (e) {
            if (e.message && !e.message.includes('undefined')) {
                console.error('Command error:', e.message);
            }
        }
    });
}

// ========== MAIN START ==========
console.log('🚀 Starting SHAXXY BOT + SERVER...');

// Start everything
await initDatabase();
await loadCommands();
await startServer();  // Express API
await startBot();     // WhatsApp Bot

console.log('✅ Both Bot and Server are running!');