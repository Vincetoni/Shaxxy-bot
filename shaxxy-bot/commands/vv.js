import { downloadMediaMessage } from '@whiskeysockets/baileys';

export default {
    name: 'vv',
    category: 'UTILITIES',
    description: 'Save view-once message',
    
    async execute(sock, msg, args, { chatId, sender }) {
        // Get the quoted message properly
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        const quoted = contextInfo?.quotedMessage;
        
        console.log('🔍 Checking for view-once...');
        console.log('Quoted keys:', quoted ? Object.keys(quoted) : 'none');
        
        // View-once can be in different locations depending on WhatsApp version
        let viewOnce = null;
        let media = null;
        let mediaType = null;
        
        // Check location 1: direct viewOnceMessage
        if (quoted?.viewOnceMessage) {
            console.log('✅ Found viewOnceMessage (location 1)');
            viewOnce = quoted.viewOnceMessage;
        }
        // Check location 2: viewOnceMessageV2
        else if (quoted?.viewOnceMessageV2) {
            console.log('✅ Found viewOnceMessageV2 (location 2)');
            viewOnce = quoted.viewOnceMessageV2;
        }
        // Check location 3: viewOnceMessageV2Extension
        else if (quoted?.viewOnceMessageV2Extension) {
            console.log('✅ Found viewOnceMessageV2Extension (location 3)');
            viewOnce = quoted.viewOnceMessageV2Extension;
        }
        // Check location 4: ephemeralMessage (also view-once)
        else if (quoted?.ephemeralMessage) {
            console.log('✅ Found ephemeralMessage (location 4)');
            viewOnce = quoted.ephemeralMessage;
        }
        
        if (!viewOnce) {
            console.log('❌ No view-once structure found');
            console.log('Full quoted:', JSON.stringify(quoted, null, 2));
            return sock.sendMessage(chatId, { text: '⚠️ Reply to a view-once message with !vv' });
        }
        
        // Extract media from viewOnce
        const messageContent = viewOnce.message || viewOnce;
        
        if (messageContent.imageMessage) {
            media = messageContent.imageMessage;
            mediaType = 'image';
        } else if (messageContent.videoMessage) {
            media = messageContent.videoMessage;
            mediaType = 'video';
        } else if (messageContent.audioMessage) {
            media = messageContent.audioMessage;
            mediaType = 'audio';
        }
        
        if (!media) {
            console.log('❌ No media in view-once');
            console.log('ViewOnce content:', JSON.stringify(messageContent, null, 2));
            return sock.sendMessage(chatId, { text: '❌ No media found in view-once message' });
        }
        
        console.log('📥 Downloading', mediaType, '...');
        
        try {
            // Create proper message object for download
            const messageForDownload = {
                key: {
                    remoteJid: chatId,
                    id: contextInfo.stanzaId,
                    fromMe: false
                },
                message: {
                    [mediaType + 'Message']: media
                }
            };
            
            const buffer = await downloadMediaMessage(
                messageForDownload,
                'buffer',
                {},
                { 
                    logger: console,
                    reuploadRequest: sock.updateMediaMessage
                }
            );
            
            if (!buffer) {
                throw new Error('Empty buffer received');
            }
            
            console.log('✅ Downloaded', buffer.length, 'bytes');
            
            // Send to user's DM
            await sock.sendMessage(sender, { 
                [mediaType]: buffer,
                caption: '✅ Saved view-once media',
                mimetype: media.mimetype
            });
            
            // Confirm in group
            await sock.sendMessage(chatId, { 
                text: '✅ View-once media saved and sent to your DM!' 
            });
            
        } catch (e) {
            console.error('❌ Download failed:', e);
            
            // Try alternative method
            try {
                console.log('🔄 Trying alternative download method...');
                
                // Use the original message key if available
                const buffer = await downloadMediaMessage(
                    { message: { [mediaType + 'Message']: media } },
                    'buffer',
                    {},
                    { logger: console }
                );
                
                await sock.sendMessage(sender, { 
                    [mediaType]: buffer,
                    caption: '✅ Saved view-once media (alt method)'
                });
                
                await sock.sendMessage(chatId, { text: '✅ Sent to your DM! (alt method)' });
                
            } catch (e2) {
                await sock.sendMessage(chatId, { 
                    text: '❌ Failed to download view-once media.\nThis might be due to WhatsApp encryption or the media expired.' 
                });
            }
        }
    }
};