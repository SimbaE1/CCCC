// Navigation is now handled by separate HTML pages

// Global variables for auto-refresh
let autoRefreshInterval = null;
let currentContactId = null;

// Contact form handling
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(this);
        const name = this.querySelector('input[type="text"]').value;
        const email = this.querySelector('input[type="email"]').value;
        const topic = this.querySelector('select').value;
        const message = this.querySelector('textarea').value;
        
        // Basic validation
        if (!name || !email || !topic || !message) {
            alert('Please fill in all fields.');
            return;
        }
        
        // Show success message
        alert('Thank you for your message! We will get back to you through our Discord community.');
        
        // Reset form
        this.reset();
    });
}

// Navbar background on scroll
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(255, 255, 255, 0.98)';
    } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
    }
});

// Removed scroll animations

// Discord API integration
async function fetchDiscordWidget() {
    try {
        const response = await fetch('https://discord.com/api/guilds/1395450486110556180/widget.json');
        const data = await response.json();
        
        console.log('Discord server data:', data);
        
        // Update server stats
        const serverStatusElement = document.getElementById('serverStatus');
        const onlineMembersElement = document.getElementById('onlineMembers');
        const serverNameElement = document.getElementById('serverName');
        
        if (serverStatusElement) {
            serverStatusElement.textContent = 'Online';
            serverStatusElement.className = 'stat-value online';
        }
        
        if (onlineMembersElement && data.presence_count !== undefined) {
            onlineMembersElement.textContent = data.presence_count;
            onlineMembersElement.className = 'stat-value online';
        }
        
        if (serverNameElement && data.name) {
            serverNameElement.textContent = data.name;
        }
        
        // Update any legacy member count elements
        if (data.presence_count) {
            const memberCountElement = document.querySelector('.member-count');
            if (memberCountElement) {
                memberCountElement.textContent = `${data.presence_count} members online`;
            }
        }
        
    } catch (error) {
        console.log('Discord widget data unavailable:', error);
        
        // Set offline status
        const serverStatusElement = document.getElementById('serverStatus');
        const onlineMembersElement = document.getElementById('onlineMembers');
        const serverNameElement = document.getElementById('serverName');
        
        if (serverStatusElement) {
            serverStatusElement.textContent = 'Unavailable';
            serverStatusElement.className = 'stat-value offline';
        }
        
        if (onlineMembersElement) {
            onlineMembersElement.textContent = 'N/A';
            onlineMembersElement.className = 'stat-value offline';
        }
        
        if (serverNameElement) {
            serverNameElement.textContent = 'CCCC Server';
        }
    }
}

// Discord webhook URL
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1395558286903742564/koAmp6UZld3JV3qvfw9WbfTeGLcO1H1YjCrz9KKGcnER8G-RAnnBk4ltCBS9ENCaeEOD';

// Generate unique user ID (persistent across all conversations)
function generateUserId() {
    return 'USER-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 8).toUpperCase();
}

// Generate unique conversation ID
function generateConversationId() {
    return 'CONV-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
}

// Get or create persistent user ID
function getOrCreateUserId() {
    let userId = localStorage.getItem('cccc_user_id');
    if (!userId) {
        userId = generateUserId();
        localStorage.setItem('cccc_user_id', userId);
    }
    return userId;
}

// Get or create current conversation ID - for display purposes, but use User ID for continuity
function getOrCreateConversationId() {
    // For the purpose of giving users a consistent contact ID, always use the User ID
    const userId = getOrCreateUserId();
    const conversationId = userId.replace('USER-', 'CCCC-');
    
    // Store it for consistency
    localStorage.setItem('cccc_current_conversation_id', conversationId);
    return conversationId;
}

// Start new conversation (same contact ID, but clear conversation thread)
function startNewConversation() {
    // Keep the same contact ID but clear the conversation thread
    const conversationId = getOrCreateConversationId();
    
    // Clear conversation thread
    const conversationThread = document.getElementById('conversationThread');
    if (conversationThread) {
        conversationThread.style.display = 'none';
    }
    
    // Update status input
    const statusContactId = document.getElementById('statusContactId');
    if (statusContactId) {
        statusContactId.value = conversationId;
    }
    
    return conversationId;
}

// Send message to Discord via backend API
async function sendToDiscord(name, message, providedConversationId = null, providedUserId = null) {
    try {
        const userId = providedUserId || getOrCreateUserId();
        const conversationId = providedConversationId || getOrCreateConversationId();
        
        const webhookData = {
            name: name,
            message: message,
            conversationId: conversationId,
            userId: userId
        };

        console.log('🔄 Sending message to backend API:', webhookData);
        console.log('🔗 API URL: http://localhost:3001/api/send-webhook');
        
        const response = await fetch('http://localhost:3001/api/send-webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookData)
        });

        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Message sent successfully via backend');
            console.log('📄 Backend response:', result);
            return { success: true, conversationId: conversationId, userId: userId };
        } else {
            const errorText = await response.text();
            console.error('❌ Backend API failed - Status:', response.status);
            console.error('❌ Backend API failed - Response:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
    } catch (error) {
        console.error('Error sending via backend:', error);
        return { success: false, error: error.message };
    }
}

// Quick message form handling
document.addEventListener('DOMContentLoaded', function() {
    const quickMessageForm = document.getElementById('quickMessageForm');
    if (quickMessageForm) {
        quickMessageForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('🚀 Form submitted!');
            
            const name = document.getElementById('quickName').value.trim();
            const message = document.getElementById('quickMessage').value.trim();
            const submitButton = this.querySelector('button[type="submit"]');
            
            console.log('📝 Form data - Name:', name, 'Message:', message);
            
            if (!name || !message) {
                console.log('❌ Validation failed - missing name or message');
                alert('Please fill in both name and message fields.');
                return;
            }
            
            console.log('✅ Validation passed, proceeding with submission');
            
            // Disable button and show loading state
            submitButton.disabled = true;
            submitButton.textContent = 'Sending...';
            
            // Get user and conversation IDs
            const userId = getOrCreateUserId();
            const conversationId = getOrCreateConversationId();
            
            console.log('User ID:', userId);
            console.log('Conversation ID:', conversationId);
            
            const existingConversation = await checkExistingConversation(conversationId);
            
            if (existingConversation) {
                // Continue existing conversation
                const result = await addMessageToConversation(conversationId, message, name, userId);
                
                if (result.success) {
                    alert(`✅ Message added to your ongoing conversation! Your Conversation ID is: ${conversationId}\n\nIf no one responds within an hour, our AI assistant will provide a helpful response.`);
                    this.reset();
                    
                    // Refresh conversation thread if visible
                    const conversationThread = document.getElementById('conversationThread');
                    if (conversationThread && conversationThread.style.display !== 'none') {
                        await checkMessageStatus(conversationId);
                    }
                } else {
                    alert('❌ Failed to send message. Please try joining our Discord server directly: https://discord.gg/C2dryrBK');
                }
            } else {
                // Send new message to Discord - but use existing conversation ID if available
                const result = await sendToDiscord(name, message, conversationId, userId);
                
                if (result.success) {
                    // Store message locally
                    const messageData = {
                        id: result.conversationId,
                        userId: result.userId,
                        name: name,
                        message: message,
                        timestamp: new Date().toISOString(),
                        status: 'sent'
                    };
                    
                    // Save to localStorage
                    let messages = JSON.parse(localStorage.getItem('cccc_messages') || '[]');
                    messages.push(messageData);
                    localStorage.setItem('cccc_messages', JSON.stringify(messages));
                    
                    // Schedule auto-response - use the actual IDs from the result
                    try {
                        const schedulePayload = {
                            conversationId: result.conversationId,
                            userId: result.userId,
                            originalMessage: message,
                            userName: name
                        };
                        
                        console.log('Scheduling auto-response with payload:', schedulePayload);
                        
                        const scheduleResponse = await fetch('http://localhost:3001/api/schedule-response', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(schedulePayload)
                        });
                        
                        if (!scheduleResponse.ok) {
                            const errorText = await scheduleResponse.text();
                            console.error('Auto-response scheduling failed:', scheduleResponse.status, errorText);
                        } else {
                            console.log('Auto-response scheduled successfully');
                        }
                    } catch (error) {
                        console.error('Auto-response scheduling failed:', error);
                    }
                    
                    alert(`✅ Message sent successfully! Your Conversation ID is: ${result.conversationId}\n\nSave this ID to check for responses later. If no one responds within an hour, our AI assistant will provide a helpful response.\n\nYou can also find it in the "Check Message Status" section below.`);
                    this.reset();
                    
                    // Update the message tracker display
                    updateMessageTracker();
                } else {
                    alert('❌ Failed to send message. Please try joining our Discord server directly: https://discord.gg/C2dryrBK');
                }
            }
            
            // Re-enable button
            submitButton.disabled = false;
            submitButton.textContent = 'Send to Discord';
        });
    }
    
    // Status checker functionality
    const checkStatusBtn = document.getElementById('checkStatusBtn');
    const statusContactId = document.getElementById('statusContactId');
    const statusResult = document.getElementById('statusResult');
    
    if (checkStatusBtn && statusContactId && statusResult) {
        checkStatusBtn.addEventListener('click', function() {
            const contactId = statusContactId.value.trim();
            if (!contactId) {
                showStatusResult('Please enter a Contact ID', 'error');
                return;
            }
            
            // Stop any existing auto-refresh before starting new one
            stopAutoRefresh();
            checkMessageStatus(contactId);
        });
        
        statusContactId.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                checkStatusBtn.click();
            }
        });
    }
    
    // Load message tracker on page load
    updateMessageTracker();
    
    // Initialize conversation UI
    initializeConversationUI();
    
    // Fetch Discord data
    fetchDiscordWidget();
});

// Message status functions
function updateMessageTracker() {
    const messageList = document.getElementById('messageList');
    if (!messageList) return;
    
    const messages = JSON.parse(localStorage.getItem('cccc_messages') || '[]');
    
    if (messages.length === 0) {
        messageList.innerHTML = '<div class="empty-state">No messages sent yet</div>';
        return;
    }
    
    messageList.innerHTML = messages.reverse().map(msg => `
        <div class="message-item" onclick="copyContactId('${msg.id}')">
            <div class="message-item-header">
                <span class="message-id">${msg.id}</span>
                <span class="message-status ${msg.status}">${msg.status}</span>
            </div>
            <div class="message-preview">${msg.message.substring(0, 100)}${msg.message.length > 100 ? '...' : ''}</div>
        </div>
    `).join('');
}

function copyContactId(contactId) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(contactId).then(() => {
            document.getElementById('statusContactId').value = contactId;
            showStatusResult(`Contact ID ${contactId} copied and loaded!`, 'success');
        });
    } else {
        document.getElementById('statusContactId').value = contactId;
        showStatusResult(`Contact ID ${contactId} loaded!`, 'success');
    }
}

async function checkMessageStatus(contactId) {
    const statusResult = document.getElementById('statusResult');
    const checkStatusBtn = document.getElementById('checkStatusBtn');
    const conversationThread = document.getElementById('conversationThread');
    
    // Show loading state
    checkStatusBtn.disabled = true;
    checkStatusBtn.textContent = 'Checking...';
    showStatusResult('Checking for response...', 'pending');
    if (conversationThread) {
        conversationThread.style.display = 'none';
    }
    
    try {
        console.log('Checking message status for Contact ID:', contactId);
        
        // Check for conversation history
        const conversationResponse = await fetch(`http://localhost:3001/api/conversation?id=${contactId}`);
        console.log('Conversation API response status:', conversationResponse.status);
        
        const conversationData = await conversationResponse.json();
        console.log('Conversation data:', conversationData);
        
        if (conversationData.found) {
            // Show conversation thread
            displayConversationThread(contactId, conversationData.conversation);
            showStatusResult(`💬 Conversation thread loaded! ${conversationData.conversation.messages.length} messages found.`, 'success');
        } else {
            // Check bot API for single response (backward compatibility)
            console.log('No conversation found, checking for single response...');
            const response = await fetch(`http://localhost:3001/api/response?id=${contactId}`);
            console.log('Response API response status:', response.status);
            
            const data = await response.json();
            console.log('Response data:', data);
            
            if (data.found) {
                // Response found! Update local storage
                const messages = JSON.parse(localStorage.getItem('cccc_messages') || '[]');
                const messageIndex = messages.findIndex(msg => msg.id === contactId);
                if (messageIndex !== -1) {
                    messages[messageIndex].status = 'responded';
                    messages[messageIndex].response = data.response;
                    messages[messageIndex].responseTime = data.timestamp;
                    localStorage.setItem('cccc_messages', JSON.stringify(messages));
                    updateMessageTracker();
                }
                
                const responseTime = getTimeAgo(new Date(data.timestamp));
                showStatusResult(`✅ Response received ${responseTime}!\n\n"${data.response}"\n\n- ${data.responder}`, 'success');
            } else {
                // No response yet - check local storage for message info
                const messages = JSON.parse(localStorage.getItem('cccc_messages') || '[]');
                const localMessage = messages.find(msg => msg.id === contactId);
                
                if (localMessage) {
                    const timeAgo = getTimeAgo(new Date(localMessage.timestamp));
                    showStatusResult(`📨 Message found! Sent ${timeAgo}. No response yet. Climate activists will reply with: !respond ${contactId} [message]`, 'pending');
                } else {
                    showStatusResult(`❌ Contact ID ${contactId} not found. Please check the ID or contact us directly on Discord.`, 'error');
                }
            }
        }
    } catch (error) {
        console.error('Error checking response:', error);
        // Fallback to local check if API is down
        const messages = JSON.parse(localStorage.getItem('cccc_messages') || '[]');
        const localMessage = messages.find(msg => msg.id === contactId);
        
        if (localMessage) {
            const timeAgo = getTimeAgo(new Date(localMessage.timestamp));
            showStatusResult(`📨 Message found! Sent ${timeAgo}. Bot offline - check Discord manually or try again later.`, 'pending');
        } else {
            showStatusResult(`❌ Contact ID ${contactId} not found and bot is offline.`, 'error');
        }
    } finally {
        // Reset button
        checkStatusBtn.disabled = false;
        checkStatusBtn.textContent = 'Check Status';
        
        // Start auto-refresh every 10 seconds
        startAutoRefresh(contactId);
    }
}

function showStatusResult(message, type) {
    const statusResult = document.getElementById('statusResult');
    if (!statusResult) return;
    
    statusResult.textContent = message;
    statusResult.className = `status-result ${type}`;
    statusResult.style.display = 'block';
    
    // Auto hide after 10 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            statusResult.style.display = 'none';
        }, 10000);
    }
}

// Auto-refresh functions
function startAutoRefresh(contactId) {
    // Clear any existing interval
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    // Store the current contact ID
    currentContactId = contactId;
    
    // Start refreshing every 10 seconds
    autoRefreshInterval = setInterval(async () => {
        if (currentContactId) {
            console.log(`🔄 Auto-refreshing status for ${currentContactId}`);
            await checkMessageStatusSilently(currentContactId);
        }
    }, 10000); // 10 seconds
    
    console.log(`🔄 Auto-refresh started for ${contactId}`);
    
    // Show auto-refresh indicator
    const checkStatusBtn = document.getElementById('checkStatusBtn');
    if (checkStatusBtn) {
        checkStatusBtn.textContent = 'Check Status (Auto-refreshing...)';
        checkStatusBtn.style.background = '#10b981';
        checkStatusBtn.style.color = 'white';
    }
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        currentContactId = null;
        console.log('🛑 Auto-refresh stopped');
        
        // Reset button appearance
        const checkStatusBtn = document.getElementById('checkStatusBtn');
        if (checkStatusBtn) {
            checkStatusBtn.textContent = 'Check Status';
            checkStatusBtn.style.background = '';
            checkStatusBtn.style.color = '';
        }
    }
}

// Silent version of checkMessageStatus that doesn't show loading states
async function checkMessageStatusSilently(contactId) {
    try {
        const conversationResponse = await fetch(`http://localhost:3001/api/conversation?id=${contactId}`);
        const conversationData = await conversationResponse.json();
        
        if (conversationData.found) {
            // Update conversation thread if it exists
            const conversationThread = document.getElementById('conversationThread');
            if (conversationThread && conversationThread.style.display !== 'none') {
                displayConversationThread(contactId, conversationData.conversation);
            }
        }
    } catch (error) {
        console.error('Silent status check failed:', error);
    }
}

function getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'just now';
}

// Display conversation thread
function displayConversationThread(contactId, conversation) {
    const conversationThread = document.getElementById('conversationThread');
    const conversationMessages = document.getElementById('conversationMessages');
    
    if (!conversationThread || !conversationMessages) return;
    
    // Clear existing messages
    conversationMessages.innerHTML = '';
    
    // Add each message to the thread
    conversation.messages.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `conversation-message ${message.isResponse ? (message.responder === 'CCCC AI Assistant' ? 'ai' : 'response') : 'user'}`;
        
        const timeAgo = getTimeAgo(new Date(message.timestamp));
        const author = message.isResponse ? message.responder : 'You';
        
        messageDiv.innerHTML = `
            <div class="message-meta">
                <span class="message-author">${author}</span>
                <span class="message-timestamp">${timeAgo}</span>
            </div>
            <div class="message-content">${message.content}</div>
        `;
        
        conversationMessages.appendChild(messageDiv);
    });
    
    // Show the thread
    conversationThread.style.display = 'block';
    
    // Set up follow-up message handler
    setupFollowUpHandler(contactId);
    
    // Scroll to bottom
    conversationMessages.scrollTop = conversationMessages.scrollHeight;
}

// Check if conversation exists
async function checkExistingConversation(contactId) {
    try {
        const response = await fetch(`http://localhost:3001/api/conversation?id=${contactId}`);
        const data = await response.json();
        return data.found;
    } catch (error) {
        console.error('Error checking existing conversation:', error);
        return false;
    }
}

// Add message to existing conversation
async function addMessageToConversation(conversationId, message, userName, userId) {
    try {
        const response = await fetch('http://localhost:3001/api/add-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                conversationId: conversationId,
                message: message,
                userName: userName,
                userId: userId
            })
        });
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error adding message to conversation:', error);
        return { success: false, error: error.message };
    }
}

// Initialize conversation UI
async function initializeConversationUI() {
    const currentUserIdElement = document.getElementById('currentUserId');
    const currentContactIdElement = document.getElementById('currentContactId');
    const startNewConversationBtn = document.getElementById('startNewConversationBtn');
    const statusContactId = document.getElementById('statusContactId');
    const messageHelperText = document.getElementById('messageHelperText');
    
    if (!currentContactIdElement || !currentUserIdElement) return;
    
    // Get or create user ID (persistent)
    const userId = getOrCreateUserId();
    currentUserIdElement.textContent = userId;
    
    // Get or create conversation ID (per conversation)
    const conversationId = getOrCreateConversationId();
    currentContactIdElement.textContent = conversationId;
    
    // Auto-populate status checker
    if (statusContactId) {
        statusContactId.value = conversationId;
    }
    
    // Check if conversation exists and update UI
    const existingConversation = await checkExistingConversation(conversationId);
    if (existingConversation) {
        if (messageHelperText) {
            messageHelperText.textContent = 'Continue your conversation with climate activists:';
        }
        // Auto-load conversation
        await checkMessageStatus(conversationId);
    }
    
    // Set up start new conversation button
    if (startNewConversationBtn) {
        startNewConversationBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to clear the conversation display? Your Contact ID will remain the same so the AI will still remember all your previous messages.')) {
                const conversationId = startNewConversation();
                currentContactIdElement.textContent = conversationId;
                
                // Update helper text
                if (messageHelperText) {
                    messageHelperText.textContent = 'Message will be posted in our Discord server to connect with climate activists:';
                }
                
                // Clear status result
                const statusResult = document.getElementById('statusResult');
                if (statusResult) {
                    statusResult.style.display = 'none';
                }
                
                alert(`Conversation display cleared! Your Contact ID remains: ${conversationId}\nThe AI will still remember all your previous messages.`);
            }
        });
    }
}

// Set up follow-up message handler
function setupFollowUpHandler(contactId) {
    const sendFollowUpBtn = document.getElementById('sendFollowUpBtn');
    const followUpMessage = document.getElementById('followUpMessage');
    
    if (!sendFollowUpBtn || !followUpMessage) return;
    
    // Remove existing listeners
    sendFollowUpBtn.replaceWith(sendFollowUpBtn.cloneNode(true));
    const newSendBtn = document.getElementById('sendFollowUpBtn');
    
    newSendBtn.addEventListener('click', async function() {
        const message = followUpMessage.value.trim();
        if (!message) {
            alert('Please enter a message');
            return;
        }
        
        // Get user name and ID
        const messages = JSON.parse(localStorage.getItem('cccc_messages') || '[]');
        const localMessage = messages.find(msg => msg.id === contactId);
        const userName = localMessage ? localMessage.name : 'User';
        const userId = getOrCreateUserId();
        
        // Disable button
        newSendBtn.disabled = true;
        newSendBtn.textContent = 'Sending...';
        
        try {
            // Send follow-up message
            const response = await fetch('http://localhost:3001/api/add-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conversationId: contactId,
                    message: message,
                    userName: userName,
                    userId: userId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Add message to conversation display immediately
                const conversationMessages = document.getElementById('conversationMessages');
                const messageDiv = document.createElement('div');
                messageDiv.className = 'conversation-message user';
                messageDiv.innerHTML = `
                    <div class="message-meta">
                        <span class="message-author">You</span>
                        <span class="message-timestamp">just now</span>
                    </div>
                    <div class="message-content">${message}</div>
                `;
                conversationMessages.appendChild(messageDiv);
                conversationMessages.scrollTop = conversationMessages.scrollHeight;
                
                // Clear the input
                followUpMessage.value = '';
                
                // Show success message
                showStatusResult(`✅ Follow-up message sent! Auto-response scheduled in ${data.delayMinutes} minutes if no human responds.`, 'success');
            } else {
                showStatusResult('❌ Failed to send follow-up message. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error sending follow-up:', error);
            showStatusResult('❌ Failed to send follow-up message. Please try again.', 'error');
        } finally {
            // Re-enable button
            newSendBtn.disabled = false;
            newSendBtn.textContent = 'Send Follow-up';
        }
    });
}

// Mobile menu toggle (if needed in future)
function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    navMenu.classList.toggle('active');
}

// Removed button hover animations

// Removed parallax effect

// Removed form input animations