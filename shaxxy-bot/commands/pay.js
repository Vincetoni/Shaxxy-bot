import { getDb, getUserStats } from '../database/db.js';

export default {
    name: 'pay',
    category: 'ECONOMY',
    description: 'Send money to someone',
    usage: '!pay @user amount',
    
    async execute(sock, msg, args, context) {
        const { chatId, sender } = context;
        
        // FIX: Use msg parameter correctly, not context.msg
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        
        if (mentioned.length === 0) {
            return await sock.sendMessage(chatId, { text: '⚠️ Usage: !pay @user 100' });
        }
        
        const amount = parseInt(args.find(a => !isNaN(a)));
        if (!amount || amount <= 0) {
            return await sock.sendMessage(chatId, { text: '⚠️ Enter valid amount: !pay @user 100' });
        }
        
        const receiver = mentioned[0];
        if (receiver === sender) {
            return await sock.sendMessage(chatId, { text: '❌ Can\'t pay yourself!' });
        }
        
        const senderStats = await getUserStats(sender, chatId);
        
        if (senderStats.money < amount) {
            return await sock.sendMessage(chatId, { 
                text: `❌ You only have ${senderStats.money.toLocaleString()}` 
            });
        }
        
        const db = getDb();
        await db.run('UPDATE user_stats SET money = money - ? WHERE user_id = ? AND group_id = ?', 
                    [amount, sender, chatId]);
        await db.run('UPDATE user_stats SET money = money + ? WHERE user_id = ? AND group_id = ?', 
                    [amount, receiver, chatId]);
        
        await sock.sendMessage(chatId, { 
            text: `💸 @${sender.split('@')[0]} sent ${amount.toLocaleString()} to @${receiver.split('@')[0]}`,
            mentions: [sender, receiver]
        });
    }
};