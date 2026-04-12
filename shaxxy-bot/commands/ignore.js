export default {
    name: 'ignore',
    description: 'Toggle ignore mode for this group (owner only)',
    ownerOnly: true,
    groupOnly: true,
    usage: '!ignore',
    
    async execute(sock, msg, args, context) {
        const { chatId, config } = context;
        
        // Check if already ignored
        const isIgnored = config.ignoredGroups.includes(chatId);
        
        if (isIgnored) {
            // Remove from ignored list (unignore)
            config.ignoredGroups = config.ignoredGroups.filter(id => id !== chatId);
            await sock.sendMessage(chatId, { 
                text: '✅ *BOT RE-ACTIVATED*\n\nI will now respond to commands in this group.' 
            });
        } else {
            // Add to ignored list
            config.ignoredGroups.push(chatId);
            await sock.sendMessage(chatId, { 
                text: '🔇 *BOT IGNORED*\n\nI will no longer respond to commands in this group.\nOwner can use !ignore again to reactivate me.' 
            });
        }
        
        console.log('📋 Current ignored groups:', config.ignoredGroups);
    }
};