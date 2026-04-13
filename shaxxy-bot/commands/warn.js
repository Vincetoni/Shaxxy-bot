import { getDb, getUserStats } from '../database/db.js';

// Export for other commands to use
export const warnings = new Map();

export default {
    name: 'warn',
    category: 'GROUP',
    description: 'Warn user (3=kick)',
    adminOnly: true,
    groupOnly: true,
    
    async execute(sock, msg, args, context) {
        const { chatId, sender, protection } = context;
        
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        
        if (mentioned.length === 0) {
            return await sock.sendMessage(chatId, { text: '⚠️ Mention a user: !warn @user [reason]' });
        }
        
        const target = mentioned[0];
        const reason = args.filter(a => !mentioned.includes(a)).join(' ') || 'No reason';
        
        // Check if target is admin
        if (await protection.isAdmin(chatId, target)) {
            return await sock.sendMessage(chatId, { text: '❌ Cannot warn an admin' });
        }
        
        const db = getDb();
        const stats = await getUserStats(target, chatId);
        const newWarnings = (stats.warnings || 0) + 1;
        
        await db.run('UPDATE user_stats SET warnings = ? WHERE user_id = ? AND group_id = ?',
                    [newWarnings, target, chatId]);
        
        if (newWarnings >= 3) {
            await sock.groupParticipantsUpdate(chatId, [target], 'remove');
            await db.run('UPDATE user_stats SET warnings = 0 WHERE user_id = ? AND group_id = ?',
                        [target, chatId]);
            await sock.sendMessage(chatId, { 
                text: `🚫 @${target.split('@')[0]} kicked after 3 warnings`,
                mentions: [target]
            });
        } else {
            await sock.sendMessage(chatId, { 
                text: `⚠️ Warning ${newWarnings}/3 for @${target.split('@')[0]}\nReason: ${reason}`,
                mentions: [target]
            });
        }
    }
};