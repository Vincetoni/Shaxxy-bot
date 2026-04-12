const warnings = new Map(); // group:user -> count

export default {
    name: 'warn',
    category: 'GROUP',
    description: 'Warn user (3=kick)',
    adminOnly: true,
    groupOnly: true,
    
    async execute(sock, msg, args, context) {
        const { chatId, protection } = context;
        
        const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentioned.length === 0) {
            return sock.sendMessage(chatId, { text: '⚠️ Mention a user: !warn @user [reason]' });
        }
        
        const target = mentioned[0];
        const reason = args.slice(mentioned.length).join(' ') || 'No reason';
        
        const key = `${chatId}:${target}`;
        const current = (warnings.get(key) || 0) + 1;
        warnings.set(key, current);
        
        if (current >= 3) {
            await sock.groupParticipantsUpdate(chatId, [target], 'remove');
            await sock.sendMessage(chatId, { 
                text: `🚫 @${target.split('@')[0]} kicked after 3 warnings`,
                mentions: [target]
            });
            warnings.delete(key);
        } else {
            await sock.sendMessage(chatId, { 
                text: `⚠️ Warning ${current}/3 for @${target.split('@')[0]}\nReason: ${reason}`,
                mentions: [target]
            });
        }
    }
};