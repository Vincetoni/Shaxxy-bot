export default {
    name: 'demote',
    category: 'GROUP',
    description: 'Remove admin',
    adminOnly: true,
    groupOnly: true,
    usage: '!demote @user',
    
    async execute(sock, msg, args, { chatId }) {
        const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentioned.length === 0) {
            return sock.sendMessage(chatId, { text: '⚠️ Mention a user: !demote @user' });
        }
        
        await sock.groupParticipantsUpdate(chatId, mentioned, 'demote');
        await sock.sendMessage(chatId, { 
            text: `⬇️ Demoted ${mentioned.length} user(s) from admin`,
            mentions: mentioned
        });
    }
};