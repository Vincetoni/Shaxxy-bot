import { warnings } from './warn.js'; // Share the map

export default {
    name: 'unwarn',
    category: 'GROUP',
    description: 'Remove warning from user',
    adminOnly: true,
    groupOnly: true,
    
    async execute(sock, msg, args, { chatId }) {
        const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentioned.length === 0) {
            return sock.sendMessage(chatId, { text: '⚠️ Mention a user: !unwarn @user' });
        }
        
        const target = mentioned[0];
        const key = `${chatId}:${target}`;
        
        warnings.delete(key);
        await sock.sendMessage(chatId, { 
            text: `✅ Warnings cleared for @${target.split('@')[0]}`,
            mentions: [target]
        });
    }
};