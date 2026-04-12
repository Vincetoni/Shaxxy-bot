export default {
    name: 'menu',
    aliases: ['help', 'start'],
    description: 'Show bot menu',
    cooldown: 5,
    
    async execute(sock, msg, args, context) {
        const { chatId, commands } = context;
        
        // Get uptime
        const uptime = process.uptime();
        const minutes = Math.floor(uptime / 60);
        const seconds = Math.floor(uptime % 60);
        const uptimeStr = `${minutes}m ${seconds}s`;
        
        // Categorize commands
        const categories = {
            'GROUP': [],
            'CHAT': [],
            'GAMES': [],
            'STICKERS': [],
            'UTILITIES': [],
            'CRYPTO': [],
            'SETTINGS': []
        };
        
        // Sort commands into categories (add category property to each command)
        const uniqueCommands = [...new Map([...commands].filter(([k, v]) => !v.aliasOf).map(([k, v]) => [v.name, v])).values()];
        
        for (const cmd of uniqueCommands) {
            const cat = cmd.category || 'UTILITIES';
            if (categories[cat]) categories[cat].push(cmd);
        }
        
        // Build menu text
        let menuText = `🤍 *SHAXXY_ DOMAIN* 🤍\n`;
        menuText += `_Built By ShaxxyDev_\n\n`;
        
        menuText += `┌─────────────────────\n`;
        menuText += `│ ◌ Owner: ${context.config.ownerNumber[0].split('@')[0]}\n`;
        menuText += `│ ◌ Uptime: ${uptimeStr}\n`;
        menuText += `│ ◌ Mode: PRIVATE\n`;
        menuText += `│ ◌ Version: 1.0.0\n`;
        menuText += `└─────────────────────\n\n`;
        
        // Category emojis
        const catEmojis = {
            'GROUP': '◻',
            'CHAT': '◯',
            'GAMES': '⨷',
            'STICKERS': '⪾',
            'UTILITIES': '◌',
            'CRYPTO': '⨷',
            'SETTINGS': '◻'
        };
        
        // Build each category
        for (const [cat, cmds] of Object.entries(categories)) {
            if (cmds.length === 0) continue;
            
            menuText += ` ━━━ *${cat}* ━━━\n`;
            for (const cmd of cmds) {
                const emoji = catEmojis[cat] || '•';
                const desc = cmd.description || 'No description';
                menuText += ` ${emoji} *${context.config.prefix}${cmd.name}* - ${desc}\n`;
            }
            menuText += `\n`;
        }
        
        menuText += `_Use responsibly!_\n\n`;
        menuText += `> Dev: shaxxydevTeam`;
        
        await sock.sendMessage(chatId, { text: menuText });
    }
};