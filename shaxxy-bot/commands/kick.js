// commands/kick.js
// Alternative approach using group metadata with phone numbers

export default {
    name: 'kick',
    aliases: ['remove', 'boot'],
    description: 'Kick users by country code',
    category: 'moderation',
    usage: '.kick country <code> | .kick @user',
    cooldown: 5,
    
        async execute(sock, msg, args, context) {
        try {
            const chatId = msg.key.remoteJid;
            
            if (!chatId.endsWith('@g.us')) {
                return await sock.sendMessage(chatId, { 
                    text: '❌ This command only works in groups!' 
                });
            }
            
            const groupMetadata = await sock.groupMetadata(chatId);
            const participants = groupMetadata.participants;
            
            // Get sender
            const sender = msg.key.participant || msg.key.remoteJid;
            const senderParticipant = findParticipant(participants, sender);
            const isAdmin = senderParticipant?.admin === 'admin' || senderParticipant?.admin === 'superadmin';
            
            // Get bot info
            const rawBotLid = sock.user?.lid;
            const cleanBotLid = rawBotLid?.replace(/:\d+/, '');
            
            const botParticipant = participants.find(p => {
                return p.id.replace(/:\d+/, '') === cleanBotLid;
            });
            
            const isBotAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';
            
            if (!isAdmin) {
                return await sock.sendMessage(chatId, { text: '❌ Only admins!' });
            }
            
            if (!isBotAdmin) {
                return await sock.sendMessage(chatId, { text: '❌ Bot not admin!' });
            }
            
            if (args.length === 0) {
                return await sock.sendMessage(chatId, {
                    text: `*🦶 Kick Command:*\n.kick country <code>\n.kick all\n.kick @user`
                });
            }
            
            // ✅ DEFINE subCommand FIRST
            const subCommand = args[0].toLowerCase();
            
            // ✅ NOW check subCommand cases
            if (subCommand === 'all') {
                await kickAll(sock, chatId, participants, args.slice(1).join(' '));
            }
            else if (subCommand === 'country' || subCommand === 'cc') {
                await kickByCountry(sock, chatId, args, participants);
            } else {
                await kickByMention(sock, chatId, msg, args, participants);
            }
            
        } catch (error) {
            console.error('Kick error:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Error: ' + error.message });
        }
    }
};

// ============================================
// KICK BY COUNTRY CODE - ALTERNATIVE METHOD
// ============================================
async function kickByCountry(sock, chatId, args, participants) {
    if (args.length < 2) {
        return await sock.sendMessage(chatId, {
            text: '❌ Usage: .kick country <code>\nExample: .kick country 234'
        });
    }
    
    const targetCode = args[1].trim();
    const usersToKick = [];
    
    // Try to get phone numbers from group metadata subject owner or desc
    // Or use the participants' actual JIDs if they're phone-based
    
    for (const participant of participants) {
        // Skip admins
        if (participant.admin === 'admin' || participant.admin === 'superadmin') continue;
        
        const userJid = participant.id;
        
        // METHOD 1: Check if JID is already a phone number (not @lid)
        if (!userJid.endsWith('@lid')) {
            const phone = userJid.split('@')[0].replace(/:\d+/, '');
            const code = extractCountryCode(phone);
            
            if (code === targetCode) {
                usersToKick.push({ jid: userJid, code, phone });
            }
            continue;
        }
        
        // METHOD 2: Try to resolve LID to phone using sock.store
        const cleanLid = userJid.replace(/:\d+/, '');
        
        // Check all possible store locations
        let phone = null;
        
        // Try contacts
        const contacts = sock.store?.contacts || {};
        const contact = contacts[userJid] || contacts[cleanLid];
        if (contact?.id && !contact.id.endsWith('@lid')) {
            phone = contact.id.split('@')[0].replace(/:\d+/, '');
        }
        
        // Try groupMetadata participant info (some versions have phone)
        if (!phone && participant.phoneNumber) {
            phone = participant.phoneNumber;
        }
        
        // Try to fetch from profile picture (contains phone sometimes)
        if (!phone) {
            try {
                const ppUrl = await sock.profilePictureUrl(userJid, 'image').catch(() => null);
                if (ppUrl) {
                    // Extract from URL if possible
                    const match = ppUrl.match(/phone=([0-9]+)/);
                    if (match) phone = match[1];
                }
            } catch (e) {}
        }
        
        // If we got a phone number, check country code
        if (phone) {
            const code = extractCountryCode(phone);
            if (code === targetCode) {
                usersToKick.push({ jid: userJid, code, phone });
            }
        } else {
            console.log(`No phone for ${userJid}`);
        }
    }
    
    // If still no users, try alternative: kick by LID pattern (last resort)
    if (usersToKick.length === 0) {
        // Some LIDs might be derived from phone numbers
        // This is a heuristic approach
        for (const participant of participants) {
            if (participant.admin) continue;
            
            const lid = participant.id.replace(/:\d+/, '').split('@')[0];
            
            // Check if LID starts with country code pattern (rare but possible)
            if (lid.startsWith(targetCode)) {
                usersToKick.push({ 
                    jid: participant.id, 
                    code: targetCode, 
                    phone: 'LID:' + lid 
                });
            }
        }
    }
    
    console.log('Users to kick:', usersToKick);
    
    if (usersToKick.length === 0) {
        return await sock.sendMessage(chatId, {
            text: `❌ No users found with country code +${targetCode}\n\n` +
                  `This group uses privacy-enhanced IDs (LIDs) that hide phone numbers.\n` +
                  `Try kicking by mention instead: .kick @user`
        });
    }
    
    // Show preview
    const preview = `⚠️ *Kick Preview*\n\n` +
        `Country: +${targetCode}\n` +
        `Found: ${usersToKick.length} user(s)\n\n` +
        usersToKick.slice(0, 5).map(u => `• ${u.phone} (+${u.code})`).join('\n') +
        (usersToKick.length > 5 ? `\n...and ${usersToKick.length - 5} more` : '') +
        `\n\nReply *confirm* to kick or *cancel* to abort`;
    
    await sock.sendMessage(chatId, {
        text: preview,
        mentions: usersToKick.map(u => u.jid)
    });
    
    // Store for confirmation
    sock.pendingKick = {
        chatId,
        users: usersToKick,
        expires: Date.now() + 30000
    };
}

// ============================================
// EXECUTE PENDING KICK
// ============================================
export async function executePendingKick(sock, msg) {
    // Check for KICK_ALL first
    const pendingAll = sock.pendingKickAll;
    if (pendingAll) {
        const chatId = msg.key.remoteJid;
        if (chatId === pendingAll.chatId && Date.now() <= pendingAll.expires) {
            const text = (msg.message?.conversation || 
                        msg.message?.extendedTextMessage?.text || '').trim().toLowerCase();
            
            if (text === 'confirm') {
                let kicked = 0, failed = 0;
                
                for (const user of pendingAll.users) {
                    try {
                        await sock.groupParticipantsUpdate(chatId, [user.jid], 'remove');
                        kicked++;
                        await new Promise(r => setTimeout(r, 500));
                    } catch (err) {
                        failed++;
                    }
                }
                
                await sock.sendMessage(chatId, {
                    text: `*🦶 MASS KICK COMPLETE*\n\n` +
                          `✅ Kicked: ${kicked}\n` +
                          `❌ Failed: ${failed}`
                });
                
                delete sock.pendingKickAll;
                return true;
            }
            
            if (text === 'cancel') {
                await sock.sendMessage(chatId, { text: '❌ Mass kick cancelled' });
                delete sock.pendingKickAll;
                return true;
            }
        }
        
        if (Date.now() > pendingAll.expires) {
            delete sock.pendingKickAll;
        }
    }
    
    // Then check regular pendingKick
    const pending = sock.pendingKick;
    if (!pending) return false;
    
    const chatId = msg.key.remoteJid;
    if (chatId !== pending.chatId) return false;
    
    if (Date.now() > pending.expires) {
        delete sock.pendingKick;
        return false;
    }
    
    const text = (msg.message?.conversation || 
                msg.message?.extendedTextMessage?.text || '').trim().toLowerCase();
    
    if (text === 'confirm') {
        let kicked = 0, failed = 0;
        
        for (const user of pending.users) {
            try {
                await sock.groupParticipantsUpdate(chatId, [user.jid], 'remove');
                kicked++;
                await new Promise(r => setTimeout(r, 500));
            } catch (err) {
                console.error('Kick failed:', err.message);
                failed++;
            }
        }
        
        await sock.sendMessage(chatId, {
            text: `*🦶 Kick Complete*\n\n` +
                  `Country: +${pending.users[0]?.code}\n` +
                  `✅ Kicked: ${kicked}\n` +
                  `❌ Failed: ${failed}`
        });
        
        delete sock.pendingKick;
        return true;
    }
    
    if (text === 'cancel') {
        await sock.sendMessage(chatId, { text: '❌ Kick cancelled' });
        delete sock.pendingKick;
        return true;
    }
    
    return false;
}

// ============================================
// HELPERS
// ============================================
function findParticipant(participants, id) {
    if (!id) return null;
    const cleanId = id.replace(/:\d+/, '');
    return participants.find(p => p.id.replace(/:\d+/, '') === cleanId);
}

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
    
    // Generic: return first 3 digits
    return clean.substring(0, Math.min(3, clean.length - 9)) || 'unknown';
}

async function kickByMention(sock, chatId, msg, args, participants) {
    let targetJid = null;
    
    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        targetJid = msg.message.extendedTextMessage.contextInfo.participant;
    }
    
    if (!targetJid) {
        return await sock.sendMessage(chatId, { text: '❌ Mention a user!' });
    }
    
    const target = findParticipant(participants, targetJid);
    
    if (target?.admin) {
        return await sock.sendMessage(chatId, { text: '❌ Cannot kick admin!' });
    }
    
    try {
        await sock.groupParticipantsUpdate(chatId, [target?.id || targetJid], 'remove');
        await sock.sendMessage(chatId, { text: `✅ Kicked` });
    } catch (err) {
        await sock.sendMessage(chatId, { text: `❌ Failed: ${err.message}` });
    }
}

// ============================================
// KICK ALL USERS (non-admins only)
// ============================================
async function kickAll(sock, chatId, participants, messageText = '') {
    // Filter out admins - only kick non-admins
    const usersToKick = participants.filter(p => {
        return !p.admin; // admin is null for regular users, 'admin' or 'superadmin' for admins
    }).map(p => ({
        jid: p.id,
        id: p.id.split('@')[0]
    }));
    
    if (usersToKick.length === 0) {
        return await sock.sendMessage(chatId, {
            text: '❌ No non-admin users to kick!'
        });
    }
    
    // Show preview
    const preview = `⚠️ *MASS KICK PREVIEW*\n\n` +
        `Target: ALL non-admin users\n` +
        `Count: ${usersToKick.length} user(s)\n\n` +
        usersToKick.slice(0, 10).map((u, i) => `${i + 1}. @${u.id}`).join('\n') +
        (usersToKick.length > 10 ? `\n...and ${usersToKick.length - 10} more` : '') +
        `\n\nReply *confirm* to kick everyone\nReply *cancel* to abort`;
    
    await sock.sendMessage(chatId, {
        text: preview,
        mentions: usersToKick.map(u => u.jid)
    });
    
    // Store for confirmation
    sock.pendingKickAll = {
        chatId,
        users: usersToKick,
        reason: 'KICK_ALL',
        expires: Date.now() + 30000
    };
    
    return true;
}