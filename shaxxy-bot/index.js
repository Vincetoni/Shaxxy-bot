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
import { initDatabase } from './database/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = {
    prefix: '!',
    ownerNumber: ['09135716534@s.whatsapp.net'],
    antiNuke: true,
    antiBug: true,
    maxWarnings: 3,
    ignoredGroups: []
};

const commands = new Map();
const cooldowns = new Map();
const warnings = new Map();

// ========== AUTO-REPLY FUNCTION ==========
function getAutoReply(text, userName) {
    const lower = text.toLowerCase();
    
    if (lower.includes('who made you') || lower.includes('who created you')) {
        return `🤍 I was created by *ShaxxyDev*!`;
    }
    if (lower.includes('your name') || lower.includes('who are you')) {
        return `🤍 I'm *L-U-C-A* - your WhatsApp assistant!`;
    }
    if (lower.includes('hello') || lower.includes('hi')) {
        return `👋 Hello ${userName}! How can I help?`;
    }
    if (lower.includes('help')) {
        return `🆘 Use *!menu* to see my commands!`;
    }
    
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

// ========== PROTECTION CLASS ==========
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

// ========== MAIN BOT ==========
async function startBot() {
    // Initialize database FIRST
    try {
        await initDatabase();
        console.log('✅ Database ready');
    } catch (e) {
        console.error('❌ Database failed:', e.message);
    }
    
    await loadCommands();
    
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

    // ========== MESSAGE HANDLER ==========
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        const chatId = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        
        // Get text
        let text = msg.message?.conversation || 
                   msg.message?.extendedTextMessage?.text ||
                   msg.message?.imageMessage?.caption || '';
        
        console.log('\n📩', chatId, ':', text.substring(0, 30));

        // Ignore check
        if (config.ignoredGroups.includes(chatId)) {
            if (!text.startsWith(config.prefix + 'ignore')) return;
        }

        // Protection
        if (isGroup && (config.antiNuke || config.antiBug)) {
            if (protection.checkSpam(sender)) {
                return protection.takeAction(chatId, sender, 'SPAM');
            }
            const bug = protection.detectBug(msg.message);
            if (bug) return protection.takeAction(chatId, sender, bug);
        }

        // ========== AUTO-REPLY CHECK ==========
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

        // ========== COMMAND HANDLER ==========
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
            console.log('✅', cmdName);
        } catch (e) {
            console.error('❌', e);
            await sock.sendMessage(chatId, { text: '❌ Error' });
        }
    });
}

console.log('🚀 Starting LUCA...');
startBot();