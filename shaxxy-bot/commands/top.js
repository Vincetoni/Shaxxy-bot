import { getLeaderboard } from '../database/db.js';
import { getLevelTitle } from '../utils/levels.js';

export default {
    name: 'top',
    aliases: ['leaderboard', 'lb'],
    category: 'COMMUNITY',
    description: 'Show top 10 users',
    groupOnly: true,
    
    async execute(sock, msg, args, { chatId }) {
        const top = await getLeaderboard(chatId, 10);
        
        if (top.length === 0) {
            return sock.sendMessage(chatId, { text: '📊 No stats yet! Start chatting to earn XP.' });
        }
        
        let text = `🏆 *TOP 10 LEADERBOARD*\n\n`;
        
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        
        top.forEach((user, index) => {
            const medal = medals[index] || `${index + 1}.`;
            const title = getLevelTitle(user.level);
            text += `${medal} @${user.user_id.split('@')[0]}\n` +
                    `   Level ${user.level} (${title}) | ${user.xp.toLocaleString()} XP\n` +
                    `   💰 ${user.money.toLocaleString()} | 📨 ${user.messages}\n\n`;
        });
        
        await sock.sendMessage(chatId, { 
            text: text,
            mentions: top.map(u => u.user_id)
        });
    }
};