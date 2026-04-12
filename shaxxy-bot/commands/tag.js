// commands/tag.js
// Command to mention/tag users by country code using working LID resolution

// ✅ ADD THIS: Country flags object at the top
const countryFlags = {
    '1': '🇺🇸',    // USA/Canada
    '234': '🇳🇬',  // Nigeria
    '233': '🇬🇭',  // Ghana
    '254': '🇰🇪',  // Kenya
    '255': '🇹🇿',  // Tanzania
    '256': '🇺🇬',  // Uganda
    '27': '🇿🇦',   // South Africa
    '44': '🇬🇧',   // UK
    '49': '🇩🇪',   // Germany
    '33': '🇫🇷',   // France
    '91': '🇮🇳',   // India
    '92': '🇵🇰',   // Pakistan
    '86': '🇨🇳',   // China
    '81': '🇯🇵',   // Japan
    '7': '🇷🇺',    // Russia
    '20': '🇪🇬',   // Egypt
    '212': '🇲🇦',  // Morocco
    '213': '🇩🇿',  // Algeria
    // Add more as needed
};

// ✅ ADD THIS: Helper function to get flag
function getCountryFlag(code) {
    return countryFlags[code] || '🌐';
}

export default {
    name: 'tag',
    aliases: ['mention', 't'],
    description: 'Mention users by country code or tag all members',
    category: 'group',
    usage: '.tag <country_code|all> [message]',
    cooldown: 5,
    
    async execute(sock, msg, args, context) {
        try {
            const { chatId } = context;
            
            // Check if command is used in a group
            if (!chatId.endsWith('@g.us')) {
                return await sock.sendMessage(chatId, {
                    text: '❌ This command can only be used in groups!'
                });
            }

            // Get group metadata
            const groupMetadata = await sock.groupMetadata(chatId);
            const participants = groupMetadata.participants;

            if (args.length === 0) {
                return await sock.sendMessage(chatId, {
                    text: `📋 *Usage:*\n.tag <country_code|all> [message]\n\n*Examples:*\n.tag 234 Hello Nigerians!\n.tag all Meeting in 5 minutes\n.tag 1,44,91 Hello team!`
                });
            }

            const target = args[0].toLowerCase();
            const messageText = args.slice(1).join(' ') || 'Attention! 📢';

            let targets = [];

            if (target === 'all') {
                // Tag everyone
                targets = participants.map(p => ({ jid: p.id, phone: p.id.split('@')[0], code: 'all' }));
            } else if (target.includes(',')) {
                // Multiple country codes: .tag 234,1,44
                const codes = target.split(',').map(c => c.trim());
                targets = [];
                
                for (const participant of participants) {
                    const userJid = participant.id;
                    let phone = null;
                    let code = null;
                    
                    // METHOD 1: Check if JID is already a phone number (not @lid)
                    if (!userJid.endsWith('@lid')) {
                        phone = userJid.split('@')[0].replace(/:\d+/, '');
                        code = extractCountryCode(phone);
                    } else {
                        // METHOD 2: Try to resolve LID to phone using sock.store
                        const cleanLid = userJid.replace(/:\d+/, '');
                        
                        // Try contacts
                        const contacts = sock.store?.contacts || {};
                        const contact = contacts[userJid] || contacts[cleanLid];
                        if (contact?.id && !contact.id.endsWith('@lid')) {
                            phone = contact.id.split('@')[0].replace(/:\d+/, '');
                            code = extractCountryCode(phone);
                        }
                        
                        // Try groupMetadata participant info
                        if (!phone && participant.phoneNumber) {
                            phone = participant.phoneNumber;
                            code = extractCountryCode(phone);
                        }
                        
                        // Try profile picture URL
                        if (!phone) {
                            try {
                                const ppUrl = await sock.profilePictureUrl(userJid, 'image').catch(() => null);
                                if (ppUrl) {
                                    const match = ppUrl.match(/phone=([0-9]+)/);
                                    if (match) {
                                        phone = match[1];
                                        code = extractCountryCode(phone);
                                    }
                                }
                            } catch (e) {}
                        }
                    }
                    
                    if (code && codes.includes(code)) {
                        targets.push({ jid: userJid, phone: phone || 'unknown', code });
                    }
                }
            } else {
                // Single country code: .tag 234
                targets = [];
                
                for (const participant of participants) {
                    const userJid = participant.id;
                    let phone = null;
                    let code = null;
                    
                    // METHOD 1: Check if JID is already a phone number (not @lid)
                    if (!userJid.endsWith('@lid')) {
                        phone = userJid.split('@')[0].replace(/:\d+/, '');
                        code = extractCountryCode(phone);
                    } else {
                        // METHOD 2: Try to resolve LID to phone using sock.store
                        const cleanLid = userJid.replace(/:\d+/, '');
                        
                        // Try contacts
                        const contacts = sock.store?.contacts || {};
                        const contact = contacts[userJid] || contacts[cleanLid];
                        if (contact?.id && !contact.id.endsWith('@lid')) {
                            phone = contact.id.split('@')[0].replace(/:\d+/, '');
                            code = extractCountryCode(phone);
                        }
                        
                        // Try groupMetadata participant info
                        if (!phone && participant.phoneNumber) {
                            phone = participant.phoneNumber;
                            code = extractCountryCode(phone);
                        }
                        
                        // Try profile picture URL
                        if (!phone) {
                            try {
                                const ppUrl = await sock.profilePictureUrl(userJid, 'image').catch(() => null);
                                if (ppUrl) {
                                    const match = ppUrl.match(/phone=([0-9]+)/);
                                    if (match) {
                                        phone = match[1];
                                        code = extractCountryCode(phone);
                                    }
                                }
                            } catch (e) {}
                        }
                    }
                    
                    if (code === target) {
                        targets.push({ jid: userJid, phone: phone || 'unknown', code });
                    }
                }
            }

            if (targets.length === 0) {
                return await sock.sendMessage(chatId, {
                    text: `❌ No members found with country code +${target}\n\nNote: Some users may have privacy-enabled IDs (LIDs) that hide phone numbers.`
                });
            }

            // ✅ REPLACE THIS SECTION (lines 140-150) with neat arrangement:
            
            // Generate mentions
            const mentions = targets.map(t => t.jid);
            
            // Create numbered list with flags
            const numberedList = targets.map((t, index) => {
                const flag = getCountryFlag(t.code === 'all' ? extractCountryCode(t.phone) : t.code);
                return `${index + 1}. ${flag} @${t.jid.split('@')[0]}`;
            }).join('\n');

            // Get main flag for header
            const mainFlag = target === 'all' ? '🌍' : getCountryFlag(target.split(',')[0]);

            // Send neatly arranged message
            await sock.sendMessage(chatId, {
                text: `${mainFlag} *${messageText}*\n\n` +
                      `📊 *Tagged ${targets.length} member(s):*\n` +
                      `${numberedList}\n\n` +
                      `━━━━━━━━━━━━━━━`,
                mentions: mentions
            });

            console.log(`Tagged ${targets.length} members with code(s): ${target}`);

        } catch (error) {
            console.error('Error in tag command:', error);
            const { chatId } = context;
            await sock.sendMessage(chatId, {
                text: '❌ Error executing command. Make sure the bot is admin!'
            });
        }
    }
};

// Helper function to extract country code from phone number
function extractCountryCode(phone) {
    const clean = phone.replace(/\D/g, '');
    
    // Nigeria
    if (clean.startsWith('234') && clean.length === 13) return '234';
    // UK
    if (clean.startsWith('44') && clean.length === 12) return '44';
    // US/Canada
    if (clean.startsWith('1') && clean.length === 11) return '1';
    // India
    if (clean.startsWith('91') && clean.length === 12) return '91';
    // Ghana
    if (clean.startsWith('233') && clean.length === 12) return '233';
    // Kenya
    if (clean.startsWith('254') && clean.length === 12) return '254';
    // South Africa
    if (clean.startsWith('27') && clean.length === 11) return '27';
    
    // Generic: return first 1-3 digits
    return clean.substring(0, Math.min(3, clean.length - 9)) || 'unknown';
}