export default {
    name: 'antinuke',
    aliases: ['nukeshield'],
    description: 'Toggle anti-nuke protection',
    adminOnly: true,
    groupOnly: true,
    cooldown: 5,
    
    async execute(sock, msg, args, context) {
        const { chatId, config } = context;
        config.antiNuke = !config.antiNuke;
        
        await sock.sendMessage(chatId, {
            text: `🛡️ Anti-Nuke is now ${config.antiNuke ? 'ENABLED ✅' : 'DISABLED ❌'}\n\n` +
                  `Protects against:\n` +
                  `• Mass member removal\n` +
                  `• Rapid group setting changes\n` +
                  `• Destructive bot actions`
        });
    }
};