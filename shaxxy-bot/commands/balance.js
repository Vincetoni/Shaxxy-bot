import { getUserStats } from '../database/db.js';

export default {
    name: 'balance',
    aliases: ['bal', 'money', 'wallet'],
    category: 'ECONOMY',
    description: 'Check your balance',
    
    async execute(sock, msg, args, context) {
        const { chatId, sender } = context;
        
        // FIX: Use msg parameter correctly
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const target = mentioned[0] || sender;
        const name = mentioned.length > 0 ? `@${target.split('@')[0]}` : 'Your';
        
        const stats = await getUserStats(target, chatId);
        
        await sock.sendMessage(chatId, { 
            text: `💰 *BALANCE FOR ${name}*\n\n` +
                  `👛 Wallet: ${stats.money.toLocaleString()}\n` +
                  `🏦 Bank: ${stats.bank.toLocaleString()}\n` +
                  `💎 Total: ${(stats.money + stats.bank).toLocaleString()}`,
            mentions: mentioned
        });
    }
};