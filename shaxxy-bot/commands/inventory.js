import { getDb } from '../database/db.js';

export default {
    name: 'inventory',
    aliases: ['inv', 'items'],
    category: 'ECONOMY',
    description: 'Show your items',
    
    async execute(sock, msg, args, { chatId, sender, msg: fullMsg }) {
        const db = getDb();
        
        const mentioned = fullMsg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const target = mentioned[0] || sender;
        const name = mentioned.length > 0 ? `@${target.split('@')[0]}` : 'Your';
        
        const items = await db.all(
            'SELECT item_name, quantity FROM inventory WHERE user_id = ? AND group_id = ?',
            [target, chatId]
        );
        
        if (items.length === 0) {
            return sock.sendMessage(chatId, { 
                text: `📦 ${name} inventory is empty\n\nBuy items with !shop`,
                mentions: mentioned
            });
        }
        
        let text = `📦 *${name.toUpperCase()} INVENTORY*\n\n`;
        items.forEach(item => {
            text += `• ${item.item_name} x${item.quantity}\n`;
        });
        
        await sock.sendMessage(chatId, { text, mentions: mentioned });
    }
};