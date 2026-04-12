export default {
    name: 'open',
    aliases: ['unmute', 'unlock'],
    category: 'GROUP',
    description: 'Unlock group (unmute)',
    adminOnly: true,
    groupOnly: true,
    
    async execute(sock, msg, args, { chatId }) {
        await sock.groupSettingUpdate(chatId, 'not_announcement');
        await sock.sendMessage(chatId, { text: '🔓 Group unlocked. Everyone can send messages.' });
    }
};