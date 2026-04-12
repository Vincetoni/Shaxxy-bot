import { getDb, getUserStats } from '../database/db.js';

export default {
    name: 'daily',
    category: 'ECONOMY',
    description: 'Claim daily reward',
    cooldown: 86400, // 24 hours
    
    async execute(sock, msg, args, { chatId, sender }) {
        const db = getDb();
        const stats = await getUserStats(sender, chatId);
        
        const now = new Date();
        const lastDaily = stats.last_daily ? new Date(stats.last_daily) : null;
        
        // Check if can claim
        if (lastDaily) {
            const hoursSince = (now - lastDaily) / (1000 * 60 * 60);
            if (hoursSince < 24) {
                const hoursLeft = Math.ceil(24 - hoursSince);
                return sock.sendMessage(chatId, { 
                    text: `⏳ Daily reward available in ${hoursLeft} hours` 
                });
            }
        }
        
        // Calculate reward (base + streak bonus)
        let streak = stats.daily_streak || 0;
        const daysSince = lastDaily ? (now - new Date(lastDaily)) / (1000 * 60 * 60 * 24) : 999;
        
        if (daysSince > 2) {
            streak = 0; // Reset streak if missed more than 1 day
        } else {
            streak++;
        }
        
        const baseReward = 100;
        const streakBonus = streak * 10;
        const totalReward = baseReward + streakBonus;
        
        // Update database
        await db.run(
            `UPDATE user_stats 
             SET money = money + ?, daily_streak = ?, last_daily = ? 
             WHERE user_id = ? AND group_id = ?`,
            [totalReward, streak, now.toISOString(), sender, chatId]
        );
        
        await sock.sendMessage(chatId, { 
            text: `🎁 *DAILY REWARD CLAIMED!*\n\n` +
                  `💰 Base: ${baseReward}\n` +
                  `🔥 Streak Bonus: +${streakBonus} (${streak} day streak)\n` +
                  `💰 Total: ${totalReward}\n\n` +
                  `Come back tomorrow for more!`
        });
    }
};