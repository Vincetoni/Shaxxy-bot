export default {
    name: 'ping',
    description: 'Check bot latency',
    cooldown: 3,
    
    async execute(sock, msg, args, context) {
        const { chatId } = context;
        const start = Date.now();
        await sock.sendMessage(chatId, { text: '🏓 Pong! `SHAXXY IS ONLINE 🟢`' });
        const latency = Date.now() - start;
        await sock.sendMessage(chatId, { text: `📊 Latency: ${latency}ms` });
    }
};