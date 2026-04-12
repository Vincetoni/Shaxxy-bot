import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
    name: 'help',
    aliases: ['h', 'commands'],
    description: 'Show all commands',
    
    async execute(sock, msg, args, context) {
        const { chatId, commands } = context;
        
        // React
        await sock.sendMessage(chatId, { 
            react: { text: '📚', key: msg.key } 
        });
        
        // Build help text dynamically
        let helpText = '*📚 COMMAND LIST*\n\n';
        
        // Group commands by category (you could add category property to commands)
        const categories = {
            '⚙️ General': [],
            '🛡️ Protection': [],
            '👮 Admin': [],
            '🎉 Fun': []
        };
        
        // Sort commands into categories (simplified - you can expand this)
        for (const [name, cmd] of commands) {
            if (cmd.adminOnly) categories['👮 Admin'].push(cmd);
            else if (cmd.name.includes('anti') || cmd.name.includes('protect')) categories['🛡️ Protection'].push(cmd);
            else if (['joke', 'fun', 'meme'].includes(cmd.name)) categories['🎉 Fun'].push(cmd);
            else categories['⚙️ General'].push(cmd);
        }
        
        for (const [category, cmds] of Object.entries(categories)) {
            if (cmds.length > 0) {
                helpText += `${category}\n`;
                // Remove duplicates (from aliases)
                const unique = [...new Map(cmds.map(c => [c.name, c])).values()];
                unique.forEach(cmd => {
                    helpText += `  • *!${cmd.name}* - ${cmd.description || 'No description'}\n`;
                });
                helpText += '\n';
            }
        }
        
        helpText += `_Use !commandname to run a command_\n_Prefix: ${context.config.prefix}_`;
        
        await sock.sendMessage(chatId, { text: helpText });
    }
};