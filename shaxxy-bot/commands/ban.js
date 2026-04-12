export default {
    name: 'ban',
    description: 'Ban a user permanently',
    adminOnly: true,
    groupOnly: true,
    usage: '!ban @user [reason]',
    
    async execute(sock, msg, args, context) {
        const { chatId, sender, protection } = context;
        
        const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        
        if (mentioned.length === 0) {
            await sock.sendMessage(chatId, { 
                react: { text: '❌', key: msg.key } 
            });
            return sock.sendMessage(chatId, { text: '⚠️ Mention a user to ban!\nUsage: !ban @user spamming' });
        }
        
        const target = mentioned[0];
        const reason = args.slice(mentioned.length).join(' ') || 'No reason provided';
        
        // Check if target is admin
        if (await protection.isAdmin(chatId, target)) {
            await sock.sendMessage(chatId, { 
                react: { text: '🚫', key: msg.key } 
            });
            return sock.sendMessage(chatId, { text: '❌ Cannot ban an admin!' });
        }
        
        // Success reaction
        await sock.sendMessage(chatId, { 
            react: { text: '🔨', key: msg.key } 
        });
        
        // Ban (remove + add to blocklist logic if you want)
        await sock.groupParticipantsUpdate(chatId, [target], 'remove');
        
        // Send ban "embed"
        const banEmbed = 
`*🔨 USER BANNED*

*User:* @${target.split('@')[0]}
*By:* @${sender.split('@')[0]}
*Reason:* ${reason}
*Time:* ${new Date().toLocaleString()}

_This action has been logged._`;

        await sock.sendMessage(chatId, { 
            text: banEmbed,
            mentions: [target, sender]
        });
        
        // Optional: Send DM to banned user
        try {
            await sock.sendMessage(target, { 
                text: `You were banned from ${(await sock.groupMetadata(chatId)).subject}\nReason: ${reason}` 
            });
        } catch (e) {
            console.log('Could not DM user');
        }
    }
};