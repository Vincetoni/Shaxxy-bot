export default {
    name: 'hidetag',
    category: 'CHAT',
    description: 'Tag all members (hidden)',
    adminOnly: false,
    groupOnly: true,
    
    async execute(sock, msg, args, { chatId }) {
        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants.map(p => p.id);
        
        const text = args.join(' ') || '👋 Hidden tag';
        
        // Send with mentions but no @ symbols in text
        await sock.sendMessage(chatId, { 
            text: text,
            mentions: participants
        });
    }
};