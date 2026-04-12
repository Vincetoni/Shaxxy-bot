import { downloadMediaMessage } from '@whiskeysockets/baileys';

export default {
    name: 'vv',
    category: 'UTILITIES',
    description: 'Save view-once message',
    
    async execute(sock, msg, args, { chatId, sender }) {
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        const quoted = contextInfo?.quotedMessage;
        
        console.log('🔍 Checking for view-once...');
        console.log('Quoted keys:', quoted ? Object.keys(quoted) : 'none');
        
        if (!quoted) {
            return sock.sendMessage(chatId, { text: '⚠️ Reply to a view-once message with !vv' });
        }
        
        let media = null;
        let mediaType = null;
        let isViewOnce = false;
        
        // Check for view-once flag in imageMessage or videoMessage
        if (quoted.imageMessage) {
            media = quoted.imageMessage;
            mediaType = 'image';
            isViewOnce = media.viewOnce === true;
            console.log('📷 Found imageMessage, viewOnce:', isViewOnce);
        } 
        else if (quoted.videoMessage) {
            media = quoted.videoMessage;
            mediaType = 'video';
            isViewOnce = media.viewOnce === true;
            console.log('🎥 Found videoMessage, viewOnce:', isViewOnce);
        }
        // Also check old viewOnceMessage format (for compatibility)
        else if (quoted.viewOnceMessage || quoted.viewOnceMessageV2) {
            const viewOnce = quoted.viewOnceMessage || quoted.viewOnceMessageV2;
            const content = viewOnce.message || viewOnce;
            
            if (content.imageMessage) {
                media = content.imageMessage;
                mediaType = 'image';
                isViewOnce = true;
            } else if (content.videoMessage) {
                media = content.videoMessage;
                mediaType = 'video';
                isViewOnce = true;
            }
            console.log('📦 Found viewOnceMessage wrapper');
        }
        
        if (!isViewOnce || !media) {
            console.log('❌ Not a view-once message or no media found');
            return sock.sendMessage(chatId, { 
                text: '⚠️ This is not a view-once message!\n\nReply to a view-once photo/video with !vv' 
            });
        }
        
        console.log('✅ View-once detected, type:', mediaType);
        console.log('📥 Downloading...');
        
        try {
            // Create message object for download
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
                throw new Error('Empty buffer - media may have expired');
            }
            
            console.log('✅ Downloaded', buffer.length, 'bytes');
            
            // Send to user's DM
            await sock.sendMessage(sender, { 
                [mediaType]: buffer,
                caption: '✅ Saved view-once media\n\n_This message was originally sent as view-once_'
            });
            
            // Confirm in group
            await sock.sendMessage(chatId, { 
                text: '✅ View-once media saved and sent to your DM!' 
            });
            
        } catch (e) {
            console.error('❌ Download failed:', e);
            await sock.sendMessage(chatId, { 
                text: '❌ Failed to download view-once media.\nPossible reasons:\n• Media expired (view-once expires after viewing)\n• WhatsApp encryption changed\n• Try forwarding the message to me in DM instead' 
            });
        }
    }
};