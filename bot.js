const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
require('dotenv').config();

// Modern Node.js has fetch built-in (18+)

// Bot configuration
const BOT_TOKEN = process.env.BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID || '1395450486110556180';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const AUTO_RESPONSE_DELAY = parseInt(process.env.AUTO_RESPONSE_DELAY) || 3600000; // 1 hour in milliseconds
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const RESPONSES_FILE = path.join(__dirname, 'responses.json');
const PENDING_FILE = path.join(__dirname, 'pending.json');
const CONVERSATIONS_FILE = path.join(__dirname, 'conversations.json');
const USER_HISTORY_FILE = path.join(__dirname, 'user_history.json');
const PORT = 3001;

// Initialize Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Load existing responses
function loadResponses() {
    try {
        if (fs.existsSync(RESPONSES_FILE)) {
            return JSON.parse(fs.readFileSync(RESPONSES_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading responses:', error);
    }
    return {};
}

// Save responses
function saveResponses(responses) {
    try {
        fs.writeFileSync(RESPONSES_FILE, JSON.stringify(responses, null, 2));
        console.log('Responses saved successfully');
    } catch (error) {
        console.error('Error saving responses:', error);
    }
}

// Store for responses, pending messages, conversations, and user history
let responses = loadResponses();
let pendingMessages = loadPendingMessages();
let conversations = loadConversations();
let userHistory = loadUserHistory();

// Load pending messages
function loadPendingMessages() {
    try {
        if (fs.existsSync(PENDING_FILE)) {
            return JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading pending messages:', error);
    }
    return {};
}

// Save pending messages
function savePendingMessages(pending) {
    try {
        // Create a copy without timeoutId (which can't be serialized)
        const pendingToSave = {};
        for (const [key, value] of Object.entries(pending)) {
            pendingToSave[key] = {
                originalMessage: value.originalMessage,
                userName: value.userName,
                userId: value.userId,
                timestamp: value.timestamp,
                scheduledTime: value.scheduledTime
                // Exclude timeoutId as it can't be serialized
            };
        }
        fs.writeFileSync(PENDING_FILE, JSON.stringify(pendingToSave, null, 2));
    } catch (error) {
        console.error('Error saving pending messages:', error);
    }
}

// Load conversations
function loadConversations() {
    try {
        if (fs.existsSync(CONVERSATIONS_FILE)) {
            return JSON.parse(fs.readFileSync(CONVERSATIONS_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading conversations:', error);
    }
    return {};
}

// Save conversations
function saveConversations(conversations) {
    try {
        fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(conversations, null, 2));
    } catch (error) {
        console.error('Error saving conversations:', error);
    }
}

// Add message to conversation history
function addToConversation(contactId, message, isResponse = false, responder = null) {
    if (!conversations[contactId]) {
        conversations[contactId] = {
            messages: [],
            created: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };
    }
    
    conversations[contactId].messages.push({
        content: message,
        timestamp: new Date().toISOString(),
        isResponse: isResponse,
        responder: responder
    });
    
    conversations[contactId].lastActivity = new Date().toISOString();
    saveConversations(conversations);
}

// Get conversation history
function getConversationHistory(contactId) {
    return conversations[contactId] || null;
}

// Load user history
function loadUserHistory() {
    try {
        if (fs.existsSync(USER_HISTORY_FILE)) {
            return JSON.parse(fs.readFileSync(USER_HISTORY_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading user history:', error);
    }
    return {};
}

// Save user history
function saveUserHistory(history) {
    try {
        fs.writeFileSync(USER_HISTORY_FILE, JSON.stringify(history, null, 2));
    } catch (error) {
        console.error('Error saving user history:', error);
    }
}

// Add message to user history
function addToUserHistory(userId, userName, message, conversationId, isResponse = false, responder = null) {
    if (!userHistory[userId]) {
        userHistory[userId] = {
            userName: userName,
            messages: [],
            conversations: [],
            firstSeen: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };
    }
    
    userHistory[userId].messages.push({
        content: message,
        timestamp: new Date().toISOString(),
        conversationId: conversationId,
        isResponse: isResponse,
        responder: responder
    });
    
    // Track conversation IDs for this user
    if (!userHistory[userId].conversations.includes(conversationId)) {
        userHistory[userId].conversations.push(conversationId);
    }
    
    userHistory[userId].lastActivity = new Date().toISOString();
    userHistory[userId].userName = userName; // Update in case name changed
    
    saveUserHistory(userHistory);
}

// Get user history
function getUserHistory(userId) {
    return userHistory[userId] || null;
}

// AI Response function
async function generateAIResponse(originalMessage, userName, conversationId, userId) {
    if (!GEMINI_API_KEY) {
        console.log('⚠️ GEMINI_API_KEY not configured, skipping auto-response');
        return null;
    }

    try {
        // Get user's complete history across all conversations
        const userHist = getUserHistory(userId);
        let userContext = '';
        
        if (userHist && userHist.messages.length > 0) {
            userContext = `\n\nUser's complete message history across all conversations:\n`;
            userHist.messages.forEach((msg, index) => {
                const role = msg.isResponse ? `Response from ${msg.responder}` : `Message from ${userName}`;
                const convId = msg.conversationId.substring(0, 8) + '...';
                userContext += `${index + 1}. [${convId}] ${role}: "${msg.content}"\n`;
            });
        }

        // Get current conversation history for immediate context
        const conversation = getConversationHistory(conversationId);
        let conversationContext = '';
        
        if (conversation && conversation.messages.length > 0) {
            conversationContext = '\n\nCurrent conversation:\n';
            conversation.messages.forEach((msg, index) => {
                const role = msg.isResponse ? `Response from ${msg.responder}` : `Message from ${userName}`;
                conversationContext += `${index + 1}. ${role}: "${msg.content}"\n`;
            });
            conversationContext += `\nLatest message from ${userName}: "${originalMessage}"\n`;
        }

        const prompt = `You are a helpful assistant for the Children's Climate Change Committee (CCCC). 
A user named "${userName}" (User ID: ${userId}) has been communicating with us.${userContext}${conversationContext}

Please respond directly to their message. Read what they actually said and respond appropriately:

1. If they ask a specific question or make a specific request, answer that directly
2. If they're asking for climate-related help, provide climate activism guidance
3. If they're making casual conversation, respond conversationally
4. If they give you instructions (like "respond with X"), follow those instructions
5. Be natural and actually engage with what they wrote

Keep responses under 200 words and be conversational. If appropriate, you can mention our Discord community at https://discord.gg/C2dryrBK for climate activism discussions.

IMPORTANT: Actually read and respond to their specific message content - don't give generic climate responses unless they're actually asking about climate issues.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    maxOutputTokens: 300,
                    temperature: 0.7
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API responded with status ${response.status}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
        console.error('Error generating Gemini response:', error);
        return `Thank you for your message about climate action, ${userName}! 🌍 While our human volunteers are currently busy, we want you to know that every voice matters in the fight against climate change. Please join our Discord community at https://discord.gg/C2dryrBK to connect with other young climate activists and find ways to make a difference in your area!`;
    }
}

// Schedule auto-response
function scheduleAutoResponse(conversationId, originalMessage, userName, userId) {
    const scheduledTime = new Date().toISOString();
    
    const timeoutId = setTimeout(async () => {
        // Check if a human already responded AFTER this message was sent (not AI)
        if (responses[conversationId] && 
            !responses[conversationId].isAutoResponse && 
            new Date(responses[conversationId].timestamp) > new Date(scheduledTime)) {
            console.log(`⏰ Human already responded to ${conversationId}, cancelling auto-response`);
            delete pendingMessages[conversationId];
            savePendingMessages(pendingMessages);
            return;
        }

        console.log(`⏰ Generating auto-response for ${conversationId} after 1 hour wait`);
        const aiResponse = await generateAIResponse(originalMessage, userName, conversationId, userId);
        
        if (aiResponse) {
            // Store AI response
            responses[conversationId] = {
                response: aiResponse,
                responder: 'CCCC AI Assistant',
                timestamp: new Date().toISOString(),
                isAutoResponse: true
            };
            
            // Add to conversation history
            addToConversation(conversationId, aiResponse, true, 'CCCC AI Assistant');
            
            // Add to user history
            addToUserHistory(userId, userName, aiResponse, conversationId, true, 'CCCC AI Assistant');
            
            // Send AI response to Discord
            const aiWebhookData = {
                username: "CCCC AI Assistant",
                avatar_url: "https://cdn.discordapp.com/embed/avatars/4.png",
                content: `🤖 **AI Response to ${userName}**
**Conversation ID:** \`${conversationId}\`
**User ID:** \`${userId}\`

**AI Response:** ${aiResponse}

💡 *This was an automated response. You can still reply with:* \`!respond ${conversationId} Your response here\``
            };
            
            const WEBHOOK_URL = DISCORD_WEBHOOK_URL;
            
            try {
                const aiWebhookResponse = await fetch(WEBHOOK_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(aiWebhookData)
                });
                
                if (aiWebhookResponse.ok) {
                    console.log(`📤 AI response webhook sent to Discord for ${conversationId}`);
                } else {
                    console.error('AI response webhook failed:', aiWebhookResponse.status);
                }
            } catch (webhookError) {
                console.error('Error sending AI response webhook:', webhookError);
            }
            
            saveResponses(responses);
            console.log(`🤖 Auto-response generated for ${conversationId}`);
        }
        
        // Remove from pending
        delete pendingMessages[conversationId];
        savePendingMessages(pendingMessages);
    }, AUTO_RESPONSE_DELAY);
    
    // Store pending message with timeout ID
    pendingMessages[conversationId] = {
        originalMessage,
        userName,
        userId,
        timestamp: new Date().toISOString(),
        scheduledTime: scheduledTime,
        timeoutId
    };
    
    // Note: Message is already added to conversation history by the calling function
    // No need to add it again here to avoid duplicates
    
    savePendingMessages(pendingMessages);
    console.log(`⏱️ Auto-response scheduled for ${conversationId} in ${AUTO_RESPONSE_DELAY/1000/60} minutes`);
}

// Bot ready event
client.once('ready', () => {
    console.log(`✅ CCCC Bot is online as ${client.user.tag}!`);
    console.log(`🌐 API server running on http://localhost:${PORT}`);
    console.log(`🌍 Climate responses file: ${RESPONSES_FILE}`);
});

// Message handler
client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Check if message starts with !respond
    if (message.content.startsWith('!respond ')) {
        const args = message.content.slice(9).trim();
        const spaceIndex = args.indexOf(' ');
        
        if (spaceIndex === -1) {
            await message.reply('❌ Usage: `!respond CONTACT_ID Your response message here`');
            return;
        }
        
        const contactId = args.slice(0, spaceIndex).trim();
        const responseText = args.slice(spaceIndex + 1).trim();
        
        if (!contactId || !responseText) {
            await message.reply('❌ Usage: `!respond CONTACT_ID Your response message here`');
            return;
        }
        
        // Validate contact ID format (accept both old CCCC- and new CONV- format)
        if (!contactId.startsWith('CCCC-') && !contactId.startsWith('CONV-')) {
            await message.reply('❌ Invalid Contact ID format. Should start with `CCCC-` or `CONV-`');
            return;
        }
        
        // Store the response
        responses[contactId] = {
            response: responseText,
            responder: message.author.tag,
            timestamp: new Date().toISOString(),
            channelId: message.channel.id,
            messageId: message.id
        };
        
        // Add to conversation history
        addToConversation(contactId, responseText, true, message.author.tag);
        
        // Add to user history if we have the user ID
        if (pendingMessages[contactId] && pendingMessages[contactId].userId) {
            addToUserHistory(pendingMessages[contactId].userId, pendingMessages[contactId].userName, responseText, contactId, true, message.author.tag);
        }
        
        // Cancel auto-response if it was pending
        if (pendingMessages[contactId]) {
            clearTimeout(pendingMessages[contactId].timeoutId);
            delete pendingMessages[contactId];
            savePendingMessages(pendingMessages);
            console.log(`⏹️ Cancelled auto-response for ${contactId} - human responded`);
        }
        
        // Save to file
        saveResponses(responses);
        
        // Send confirmation
        await message.reply(`✅ Response saved for Contact ID: \`${contactId}\`\n\n**Response:** ${responseText}\n\n*Users can now check this response on the website using their Contact ID.*`);
        
        console.log(`📤 Response saved for ${contactId} by ${message.author.tag}`);
    }
    
    // Help command
    else if (message.content === '!help' || message.content === '!respond') {
        await message.reply({
            embeds: [{
                title: '🤖 CCCC Bot Help',
                description: 'This bot manages responses to climate activist website messages.',
                color: 0x2563eb,
                fields: [
                    {
                        name: '📝 Respond to Messages',
                        value: '`!respond CCCC-ABC123 Your response here`',
                        inline: false
                    },
                    {
                        name: '📊 Check Stats',
                        value: '`!stats` - Show response statistics',
                        inline: false
                    },
                    {
                        name: '🔍 List Responses',
                        value: '`!list` - Show recent responses',
                        inline: false
                    }
                ],
                footer: {
                    text: 'CCCC Response Bot'
                }
            }]
        });
    }
    
    // Stats command
    else if (message.content === '!stats') {
        const totalResponses = Object.keys(responses).length;
        const recentResponses = Object.values(responses).filter(r => {
            const responseDate = new Date(r.timestamp);
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return responseDate > oneDayAgo;
        }).length;
        
        await message.reply({
            embeds: [{
                title: '📊 Response Statistics',
                color: 0x10b981,
                fields: [
                    {
                        name: 'Total Responses',
                        value: totalResponses.toString(),
                        inline: true
                    },
                    {
                        name: 'Last 24 Hours',
                        value: recentResponses.toString(),
                        inline: true
                    }
                ],
                timestamp: new Date()
            }]
        });
    }
    
    // List recent responses
    else if (message.content === '!list') {
        const recentResponses = Object.entries(responses)
            .sort(([,a], [,b]) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5);
        
        if (recentResponses.length === 0) {
            await message.reply('📭 No responses found.');
            return;
        }
        
        const responseList = recentResponses.map(([contactId, data]) => {
            const date = new Date(data.timestamp).toLocaleDateString();
            const preview = data.response.length > 50 ? data.response.substring(0, 50) + '...' : data.response;
            return `**${contactId}** (${date})\n${preview}`;
        }).join('\n\n');
        
        await message.reply({
            embeds: [{
                title: '📋 Recent Responses',
                description: responseList,
                color: 0x2563eb,
                footer: {
                    text: 'Showing last 5 responses'
                }
            }]
        });
    }
});

// Create HTTP server for API
const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    
    // API endpoint to check response
    if (parsedUrl.pathname === '/api/response' && req.method === 'GET') {
        const contactId = parsedUrl.query.id;
        
        if (!contactId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Contact ID required' }));
            return;
        }
        
        const response = responses[contactId];
        
        if (response) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                found: true,
                contactId: contactId,
                response: response.response,
                timestamp: response.timestamp,
                responder: response.responder
            }));
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                found: false,
                contactId: contactId
            }));
        }
    }
    
    // API endpoint to list all responses
    else if (parsedUrl.pathname === '/api/responses' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            total: Object.keys(responses).length,
            responses: responses
        }));
    }
    
    // API endpoint to schedule auto-response for new message
    else if (parsedUrl.pathname === '/api/schedule-response' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                console.log('Received schedule-response request body:', body);
                const data = JSON.parse(body);
                
                // Handle backwards compatibility - support both old and new formats
                let conversationId = data.conversationId || data.contactId;
                let userId = data.userId;
                const originalMessage = data.originalMessage;
                const userName = data.userName;
                
                console.log('Parsed data:', { conversationId, userId, originalMessage, userName });
                
                if (!conversationId || !originalMessage || !userName) {
                    console.error('Missing required fields:', { conversationId, userId, originalMessage, userName });
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing required fields: conversationId/contactId, originalMessage, userName' }));
                    return;
                }
                
                // If no userId provided, generate one (for backwards compatibility)
                if (!userId) {
                    userId = 'USER-legacy-' + Date.now().toString(36);
                    console.log('Generated legacy userId:', userId);
                }
                
                // Schedule auto-response
                scheduleAutoResponse(conversationId, originalMessage, userName, userId);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: `Auto-response scheduled for ${conversationId}`,
                    delayMinutes: AUTO_RESPONSE_DELAY / 1000 / 60
                }));
                
            } catch (error) {
                console.error('Error parsing schedule-response request:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON body: ' + error.message }));
            }
        });
    }
    
    // API endpoint to add message to existing conversation
    else if (parsedUrl.pathname === '/api/add-message' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                const { conversationId, message, userName, userId } = JSON.parse(body);
                
                if (!conversationId || !message || !userName || !userId) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing required fields: conversationId, message, userName, userId' }));
                    return;
                }
                
                // Add to conversation history
                addToConversation(conversationId, message, false, null);
                
                // Add to user history
                addToUserHistory(userId, userName, message, conversationId, false, null);
                
                // Send Discord webhook for the new message
                const webhookData = {
                    username: "CCCC Website",
                    avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
                    content: `🌍 **New Website Message**
**From:** ${userName}
**Conversation ID:** \`${conversationId}\`
**User ID:** \`${userId}\`

**Message:** ${message}

📝 **To respond:** \`!respond ${conversationId} Your response here\``
                };
                
                const WEBHOOK_URL = DISCORD_WEBHOOK_URL;
                
                try {
                    const webhookResponse = await fetch(WEBHOOK_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(webhookData)
                    });
                    
                    if (webhookResponse.ok) {
                        console.log(`📤 Follow-up webhook sent to Discord for ${conversationId}`);
                    } else {
                        console.error('Follow-up webhook failed:', webhookResponse.status);
                    }
                } catch (webhookError) {
                    console.error('Error sending follow-up webhook:', webhookError);
                }
                
                // Schedule auto-response for the new message
                scheduleAutoResponse(conversationId, message, userName, userId);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: `Message added to conversation ${conversationId}`,
                    delayMinutes: AUTO_RESPONSE_DELAY / 1000 / 60
                }));
                
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON body' }));
            }
        });
    }
    
    // API endpoint to send webhook to Discord
    else if (parsedUrl.pathname === '/api/send-webhook' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                const { name, message, conversationId, userId } = JSON.parse(body);
                
                if (!name || !message || !conversationId || !userId) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing required fields: name, message, conversationId, userId' }));
                    return;
                }
                
                // Create webhook payload - using exact format from working test-webhook.js
                const webhookData = {
                    username: "CCCC Website",
                    avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
                    content: `🌍 **New Website Message**
**From:** ${name}
**Conversation ID:** \`${conversationId}\`
**User ID:** \`${userId}\`

**Message:** ${message}

📝 **To respond:** \`!respond ${conversationId} Your response here\``
                };
                
                // Send webhook to Discord
                const WEBHOOK_URL = DISCORD_WEBHOOK_URL;
                
                const webhookResponse = await fetch(WEBHOOK_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(webhookData)
                });
                
                if (webhookResponse.ok) {
                    console.log(`📤 Webhook sent to Discord for ${conversationId}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'Webhook sent successfully' }));
                } else {
                    const errorText = await webhookResponse.text();
                    console.error('Discord webhook failed:', webhookResponse.status, errorText);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to send webhook to Discord' }));
                }
                
            } catch (error) {
                console.error('Error processing webhook request:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON body' }));
            }
        });
    }
    
    // API endpoint to get conversation history
    else if (parsedUrl.pathname === '/api/conversation' && req.method === 'GET') {
        const contactId = parsedUrl.query.id;
        
        if (!contactId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Contact ID required' }));
            return;
        }
        
        const conversation = getConversationHistory(contactId);
        
        if (conversation) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                found: true,
                contactId: contactId,
                conversation: conversation
            }));
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                found: false,
                contactId: contactId
            }));
        }
    }
    
    // Health check
    else if (parsedUrl.pathname === '/api/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'online',
            bot: client.user ? client.user.tag : 'connecting',
            uptime: process.uptime(),
            responses: Object.keys(responses).length
        }));
    }
    
    // 404
    else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint not found' }));
    }
});

// Start the server
server.listen(PORT, () => {
    console.log(`🚀 API server listening on port ${PORT}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   GET /api/response?id=CONTACT_ID - Check for response`);
    console.log(`   GET /api/responses - List all responses`);
    console.log(`   GET /api/conversation?id=CONVERSATION_ID - Get conversation history`);
    console.log(`   POST /api/schedule-response - Schedule auto-response`);
    console.log(`   POST /api/add-message - Add message to conversation`);
    console.log(`   POST /api/send-webhook - Send webhook to Discord`);
    console.log(`   GET /api/health - Bot status`);
});

// Handle errors
client.on('error', console.error);
process.on('unhandledRejection', console.error);

// Login to Discord
client.login(BOT_TOKEN);