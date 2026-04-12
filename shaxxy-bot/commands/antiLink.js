// Store settings in memory (use file for persistence)
const groupSettings = new Map();

export default {
    name: 'antilink',
    category: 'CHAT',
    description: 'Anti-link protection',
    adminOnly: true,
    groupOnly: true,
    usage: '!antilink kick/warn/off',
    
    async execute(sock, msg, args, { chatId }) {
        const action = args[0]?.toLowerCase();
        
        if (!['kick', 'warn', 'off'].includes(action)) {
            return sock.sendMessage(chatId, { 
                text: '⚠️ Usage: !antilink kick/warn/off\n\n' +
                      'kick - Remove user immediately\n' +
                      'warn - Give warning (3=kick)\n' +
                      'off - Disable protection'
            });
        }
        
        if (!groupSettings.has(chatId)) groupSettings.set(chatId, {});
        groupSettings.get(chatId).antilink = action;
        
        await sock.sendMessage(chatId, { 
            text: `✅ Anti-link set to: ${action.toUpperCase()}`
        });
    }
};

// Export for use in message handler
export { groupSettings };