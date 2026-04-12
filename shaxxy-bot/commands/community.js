import { toggleCommunity, isCommunityEnabled } from '../database/db.js';

export default {
    name: 'community',
    category: 'SETTINGS',
    description: 'Toggle community stats on/off',
    adminOnly: true,
    groupOnly: true,
    usage: '!community on/off',
    
    async execute(sock, msg, args, { chatId, isGroup }) {
        if (!isGroup) {
            return sock.sendMessage(chatId, { text: '❌ This command only works in groups' });
        }

        const action = args[0]?.toLowerCase();
        
        if (!['on', 'off'].includes(action)) {
            const status = await isCommunityEnabled(chatId);
            return sock.sendMessage(chatId, { 
                text: `📊 Community Stats: ${status ? '✅ ON' : '❌ OFF'}\n\nUse: !community on/off` 
            });
        }

        const enabled = action === 'on';
        await toggleCommunity(chatId, enabled);
        
        await sock.sendMessage(chatId, { 
            text: `📊 Community Stats ${enabled ? '✅ ENABLED' : '❌ DISABLED'}\n\n` +
                  `${enabled ? 'I will now track:\n• Messages\n• XP & Levels\n• Leaderboard' : 'Stats tracking stopped.'}`
        });
    }
};