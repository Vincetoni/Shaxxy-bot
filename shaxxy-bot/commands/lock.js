export default {
    name: 'lock',
    aliases: ['mute', 'close'],
    category: 'GROUP',
    description: 'Lock group (mute)',
    adminOnly: true,
    groupOnly: true,
    
    async execute(sock, msg, args, { chatId }) {
        await sock.groupSettingUpdate(chatId, 'announcement');
        await sock.sendMessage(chatId, { text: '🔒 Group locked. Only admins can send messages.' });
    }
};