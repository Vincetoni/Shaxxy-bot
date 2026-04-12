import { getUserStats } from '../database/db.js';

export default {
    name: 'balance',
    aliases: ['bal', 'money', 'wallet'],
    category: 'ECONOMY',
    description: 'Check your balance',
    
    async execute(sock, msg, args, { chatId, sender, msg: fullMsg }) {
        const mentioned = fullMsg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const target = mentioned[0] || sender;
        const name = mentioned.length > 0 ? `@${target.split('@')[0]}` : 'You';
        
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