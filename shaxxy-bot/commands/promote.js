export default {
    name: 'promote',
    category: 'GROUP',
    description: 'Make user admin',
    adminOnly: true,
    groupOnly: true,
    usage: '!promote @user',
    
    async execute(sock, msg, args, { chatId }) {
        const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentioned.length === 0) {
            return sock.sendMessage(chatId, { text: '⚠️ Mention a user: !promote @user' });
        }
        
        await sock.groupParticipantsUpdate(chatId, mentioned, 'promote');
        await sock.sendMessage(chatId, { 
            text: `👑 Promoted ${mentioned.length} user(s) to admin`,
            mentions: mentioned
        });
    }
};