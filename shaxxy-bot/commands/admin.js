export default {
    name: 'kick',
    description: 'Remove a user from the group',
    adminOnly: true,
    groupOnly: true,
    usage: '!kick @user [reason]',
    
    async execute(sock, msg, args, context) {
        const { chatId, sender, protection } = context;
        
        const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentioned.length === 0) {
            return sock.sendMessage(chatId, { text: '❌ Please mention a user to kick. Usage: !kick @user' });
        }
        
        const target = mentioned[0];
        const reason = args.slice(mentioned.length).join(' ') || 'No reason provided';
        
        // Prevent kicking admins
        if (await protection.isAdmin(chatId, target)) {
            return sock.sendMessage(chatId, { text: '❌ Cannot kick an admin.' });
        }
        
        await sock.groupParticipantsUpdate(chatId, [target], 'remove');
        await sock.sendMessage(chatId, {
            text: `👢 User kicked\nReason: ${reason}`,
            mentions: [target]
        });
    }
};