import { getUserStats } from '../database/db.js';
import { calculateLevel, getLevelTitle, getXpForNextLevel } from '../utils/levels.js';

export default {
    name: 'stats',
    category: 'COMMUNITY',
    description: 'Show your stats',
    groupOnly: true,
    
    async execute(sock, msg, args, { chatId, sender, msg: fullMsg }) {
        // Check if viewing someone else's stats (admin only)
        const mentioned = fullMsg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        let targetUser = sender;
        let targetName = msg.pushName || 'You';
        
        if (mentioned.length > 0) {
            targetUser = mentioned[0];
            targetName = `@${targetUser.split('@')[0]}`;
        }
        
        const stats = await getUserStats(targetUser, chatId);
        const levelInfo = getXpForNextLevel(stats.xp);
        const title = getLevelTitle(stats.level);
        
        const progressBar = '█'.repeat(Math.floor(levelInfo.percent / 10)) + 
                           '░'.repeat(10 - Math.floor(levelInfo.percent / 10));
        
        const text = `📊 *STATS FOR ${targetName}*\n\n` +
                     `*Level:* ${stats.level} (${title})\n` +
                     `*XP:* ${stats.xp.toLocaleString()}\n` +
                     `*Progress:* [${progressBar}] ${levelInfo.percent}%\n` +
                     `*Next Level:* ${levelInfo.remaining.toLocaleString()} XP needed\n\n` +
                     `*Messages:* ${stats.messages.toLocaleString()}\n` +
                     `*Money:* 💰 ${stats.money.toLocaleString()}\n` +
                     `*Bank:* 🏦 ${stats.bank.toLocaleString()}\n` +
                     `*Warnings:* ${stats.warnings}/3\n` +
                     `*Commands Used:* ${stats.commands_used}`;
        
        await sock.sendMessage(chatId, { 
            text: text,
            mentions: mentioned
        });
    }
};