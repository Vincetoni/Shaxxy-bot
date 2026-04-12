import { getDb, getUserStats, addXp, isCommunityEnabled } from '../database/db.js';
import { calculateLevel, getLevelTitle } from '../utils/levels.js';

const cooldowns = new Map(); // user:group -> timestamp
const COOLDOWN_MS = 60000; // 1 minute between XP gains

export async function handleMessage(sock, msg, chatId, sender) {
    // Check if community is enabled
    const enabled = await isCommunityEnabled(chatId);
    if (!enabled) return null;

    // Check cooldown
    const cooldownKey = `${sender}:${chatId}`;
    const lastXp = cooldowns.get(cooldownKey) || 0;
    const now = Date.now();
    
    if (now - lastXp < COOLDOWN_MS) {
        return null; // Still on cooldown
    }

    // Calculate XP (random 1-5, bonus for media)
    let xpGain = Math.floor(Math.random() * 5) + 1;
    
    const hasMedia = msg.message?.imageMessage || 
                     msg.message?.videoMessage || 
                     msg.message?.audioMessage;
    if (hasMedia) xpGain += 2;

    // Add XP
    const result = await addXp(sender, chatId, xpGain);
    
    // Update cooldown
    cooldowns.set(cooldownKey, now);

    // Log message
    const db = getDb();
    await db.run(
        'INSERT INTO message_log (user_id, group_id, message_type, xp_gained) VALUES (?, ?, ?, ?)',
        [sender, chatId, hasMedia ? 'media' : 'text', xpGain]
    );

    // Update message count
    const stats = await getUserStats(sender, chatId);
    await db.run(
        'UPDATE user_stats SET messages = ?, last_message = ? WHERE user_id = ? AND group_id = ?',
        [stats.messages + 1, new Date().toISOString(), sender, chatId]
    );

    // Return level up info
    if (result.leveledUp) {
        const title = getLevelTitle(result.newLevel);
        return {
            leveledUp: true,
            newLevel: result.newLevel,
            title: title,
            xpGained: xpGain
        };
    }

    return { xpGained: xpGain, leveledUp: false };
}