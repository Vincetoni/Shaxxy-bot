import { getDb } from '../database/db.js';

export default {
    name: 'unwarn',
    category: 'GROUP',
    description: 'Remove warning from user',
    adminOnly: true,
    groupOnly: true,
    
    async execute(sock, msg, args, context) {
        const { chatId } = context;
        
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        
        if (mentioned.length === 0) {
            return await sock.sendMessage(chatId, { text: '⚠️ Mention a user: !unwarn @user' });
        }
        
        const target = mentioned[0];
        
        const db = getDb();
        await db.run('UPDATE user_stats SET warnings = 0 WHERE user_id = ? AND group_id = ?',
                    [target, chatId]);
        
        await sock.sendMessage(chatId, { 
            text: `✅ Warnings cleared for @${target.split('@')[0]}`,
            mentions: [target]
        });
    }
};