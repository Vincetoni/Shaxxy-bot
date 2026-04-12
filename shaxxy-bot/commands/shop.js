import { getDb, getUserStats } from '../database/db.js';

export default {
    name: 'shop',
    category: 'ECONOMY',
    description: 'View or buy items',
    usage: '!shop | !shop buy itemname',
    
    async execute(sock, msg, args, { chatId, sender }) {
        const db = getDb();
        
        // Show shop list
        if (args.length === 0 || args[0] !== 'buy') {
            const items = await db.all('SELECT * FROM shop_items WHERE stock != 0');
            
            let text = `🛍️ *ITEM SHOP*\n\n`;
            items.forEach(item => {
                const stock = item.stock === -1 ? '∞' : item.stock;
                text += `*${item.name}* - 💰 ${item.price.toLocaleString()}\n` +
                        `${item.description}\n` +
                        `Stock: ${stock}\n\n`;
            });
            
            text += `Use: !shop buy <itemname>`;
            return sock.sendMessage(chatId, { text });
        }
        
        // Buy item
        const itemName = args.slice(1).join(' ');
        if (!itemName) {
            return sock.sendMessage(chatId, { text: '⚠️ Usage: !shop buy XP Boost' });
        }
        
        const item = await db.get('SELECT * FROM shop_items WHERE name = ? COLLATE NOCASE', [itemName]);
        if (!item) {
            return sock.sendMessage(chatId, { text: '❌ Item not found' });
        }
        
        const userStats = await getUserStats(sender, chatId);
        if (userStats.money < item.price) {
            return sock.sendMessage(chatId, { 
                text: `❌ You need ${item.price.toLocaleString()}, you have ${userStats.money.toLocaleString()}` 
            });
        }
        
        // Deduct money and add to inventory
        await db.run('UPDATE user_stats SET money = money - ? WHERE user_id = ? AND group_id = ?',
                    [item.price, sender, chatId]);
        await db.run(`INSERT INTO inventory (user_id, group_id, item_name) VALUES (?, ?, ?)
                     ON CONFLICT(user_id, group_id, item_name) DO UPDATE SET quantity = quantity + 1`,
                    [sender, chatId, item.name]);
        
        if (item.stock > 0) {
            await db.run('UPDATE shop_items SET stock = stock - 1 WHERE id = ?', [item.id]);
        }
        
        await sock.sendMessage(chatId, { 
            text: `✅ *PURCHASED: ${item.name}*\n\n` +
                  `💰 -${item.price.toLocaleString()}\n` +
                  `Check inventory with !inv`
        });
    }
};