import { getDb, getUserStats } from '../database/db.js';

export default {
    name: 'pay',
    category: 'ECONOMY',
    description: 'Send money to someone',
    usage: '!pay @user amount',
    
    async execute(sock, msg, args, { chatId, sender, msg: fullMsg }) {
        const mentioned = fullMsg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        
        if (mentioned.length === 0) {
            return sock.sendMessage(chatId, { text: '⚠️ Usage: !pay @user 100' });
        }
        
        const amount = parseInt(args[0]) || parseInt(args[1]);
        if (!amount || amount <= 0) {
            return sock.sendMessage(chatId, { text: '⚠️ Enter a valid amount: !pay @user 100' });
        }
        
        const receiver = mentioned[0];
        if (receiver === sender) {
            return sock.sendMessage(chatId, { text: '❌ You can\'t pay yourself!' });
        }
        
        const senderStats = await getUserStats(sender, chatId);
        
        if (senderStats.money < amount) {
            return sock.sendMessage(chatId, { 
                text: `❌ You only have ${senderStats.money.toLocaleString()}` 
            });
        }
        
        const db = getDb();
        await db.run('UPDATE user_stats SET money = money - ? WHERE user_id = ? AND group_id = ?', 
                    [amount, sender, chatId]);
        await db.run('UPDATE user_stats SET money = money + ? WHERE user_id = ? AND group_id = ?', 
                    [amount, receiver, chatId]);
        
        await sock.sendMessage(chatId, { 
            text: `💸 *PAYMENT SUCCESSFUL*\n\n` +
                  `@${sender.split('@')[0]} sent ${amount.toLocaleString()} to @${receiver.split('@')[0]}`,
            mentions: [sender, receiver]
        });
    }
};