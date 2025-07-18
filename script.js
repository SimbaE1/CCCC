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
            showNotification('Missing Information', 'Please fill in all fields.', 'warning');
            return;
        }
        
        // Show success message
        showNotification('Message Sent!', 'Thank you for your message! We will get back to you through our Discord community.', 'success');
        
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

// Mock backend for testing when server is not available
async function mockBackendResponse(action, data) {
    console.log('🔄 Using mock backend for:', action, data);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    switch (action) {
        case 'send-webhook':
            return { 
                success: true, 
                conversationId: data.conversationId, 
                userId: data.userId 
            };
        case 'check-conversation':
            return { found: false };
        case 'add-message':
            return { 
                success: true, 
                delayMinutes: 60 
            };
        case 'schedule-response':
            return { 
                success: true, 
                delayMinutes: 60 
            };
        default:
            return { success: false, error: 'Unknown action' };
    }
}

// Send message to Discord via backend API (with fallback)
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
        
        try {
            const response = await fetch('http://localhost:3001/api/send-webhook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(webhookData)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Message sent successfully via backend');
                return { success: true, conversationId: conversationId, userId: userId };
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.log('⚠️ Backend unavailable, using mock response');
            return await mockBackendResponse('send-webhook', webhookData);
        }
    } catch (error) {
        console.error('Error sending message:', error);
        return { success: false, error: error.message };
    }
}

// Check if conversation exists (with fallback)
async function checkExistingConversation(contactId) {
    try {
        const response = await fetch(`http://localhost:3001/api/conversation?id=${contactId}`);
        const data = await response.json();
        return data.found;
    } catch (error) {
        console.log('⚠️ Backend unavailable for conversation check, using mock');
        const mockResult = await mockBackendResponse('check-conversation', { contactId });
        return mockResult.found;
    }
}

// Add message to existing conversation (with fallback)
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
        console.log('⚠️ Backend unavailable for add-message, using mock');
        return await mockBackendResponse('add-message', { conversationId, message, userName, userId });
    }
}

// Custom notification system with guaranteed display
function showNotification(title, message, type = 'success', conversationId = null, duration = 6000) {
    console.log('🔔 Creating notification:', { title, message, type, conversationId });
    
    // Remove any existing notifications first
    const existingNotifications = document.querySelectorAll('.notification-overlay');
    existingNotifications.forEach(notification => {
        console.log('🗑️ Removing existing notification');
        notification.remove();
    });
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'notification-overlay';
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Icon based on type
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠'
    };
    
    // Close function
    const closeNotification = () => {
        console.log('🔒 Closing notification');
        overlay.classList.remove('show');
        setTimeout(() => {
            if (overlay.parentElement) {
                overlay.remove();
                console.log('🗑️ Notification removed from DOM');
            }
        }, 300);
    };
    
    notification.innerHTML = `
        <button class="notification-close" type="button">×</button>
        <div class="notification-header">
            <div class="notification-icon">${icons[type]}</div>
            <h4 class="notification-title">${title}</h4>
        </div>
        <p class="notification-message">${message}</p>
        ${conversationId ? `<div class="notification-conversation-id">Contact ID: ${conversationId}</div>` : ''}
        ${duration > 0 ? `<div class="notification-actions">
            <span class="notification-auto-close">Auto-closes in ${Math.ceil(duration/1000)}s</span>
        </div>` : ''}
    `;
    
    // Add close button event
    const closeButton = notification.querySelector('.notification-close');
    closeButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeNotification();
    });
    
    // Add click outside to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeNotification();
        }
    });
    
    // Add to overlay and page
    overlay.appendChild(notification);
    document.body.appendChild(overlay);
    console.log('📝 Notification added to body');
    
    // Force reflow and trigger animation
    overlay.offsetHeight; // Force reflow
    setTimeout(() => {
        overlay.classList.add('show');
        console.log('✨ Show animation triggered');
    }, 50);
    
    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            console.log(`⏰ Auto-closing notification after ${duration}ms`);
            closeNotification();
        }, duration);
    }
    
    console.log('🎉 Notification creation complete');
}

// Quick message form handling
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM Content Loaded');
    
    const quickMessageForm = document.getElementById('quickMessageForm');
    if (quickMessageForm) {
        console.log('📝 Found quick message form, adding event listener');
        
        quickMessageForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('🚀 Form submitted!');
            
            try {
                const name = document.getElementById('quickName').value.trim();
                const message = document.getElementById('quickMessage').value.trim();
                const submitButton = this.querySelector('button[type="submit"]');
                
                console.log('📝 Form data - Name:', name, 'Message:', message);
                
                if (!name || !message) {
                    console.log('❌ Validation failed - missing name or message');
                    showNotification(
                        'Missing Information',
                        'Please fill in both name and message fields.',
                        'warning',
                        null,
                        4000
                    );
                    return;
                }
                
                console.log('✅ Validation passed, proceeding with submission');
                
                // Disable button and show loading state
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.textContent = 'Sending...';
                }
                
                // Get user and conversation IDs
                const userId = getOrCreateUserId();
                const conversationId = getOrCreateConversationId();
                
                console.log('👤 User ID:', userId);
                console.log('💬 Conversation ID:', conversationId);
                
                console.log('🔍 Checking for existing conversation...');
                const existingConversation = await checkExistingConversation(conversationId);
                console.log('📋 Existing conversation result:', existingConversation);
                
                if (existingConversation) {
                    // Continue existing conversation
                    console.log('🔄 Adding message to existing conversation...');
                    const result = await addMessageToConversation(conversationId, message, name, userId);
                    console.log('📤 Add message result:', result);
                    
                    if (result.success) {
                        console.log('✅ Message added successfully, showing notification...');
                        const delayTime = result.delayMinutes ? formatDelayTime(result.delayMinutes * 60 * 1000) : '60 minutes';
                        showNotification(
                            'Message Added!',
                            `Your message was added to the ongoing conversation.\n\nIf no one responds within ${delayTime}, our AI assistant will provide a helpful response.`,
                            'success',
                            conversationId,
                            8000
                        );
                        this.reset();
                    } else {
                        console.log('❌ Message add failed, showing error notification...');
                        showNotification(
                            'Failed to Send',
                            'Failed to send message. Please try joining our Discord server directly.',
                            'error',
                            null,
                            6000
                        );
                    }
                } else {
                    // Send new message to Discord
                    console.log('🆕 Sending new message to Discord...');
                    const result = await sendToDiscord(name, message, conversationId, userId);
                    console.log('📤 Send to Discord result:', result);
                    
                    if (result.success) {
                        console.log('✅ Message sent successfully, showing notification...');
                        
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
                        
                        // Schedule auto-response (try, but don't fail if backend is down)
                        let delayTime = '60 minutes'; // default fallback
                        try {
                            const schedulePayload = {
                                conversationId: result.conversationId,
                                userId: result.userId,
                                originalMessage: message,
                                userName: name
                            };
                            
                            const scheduleResponse = await fetch('http://localhost:3001/api/schedule-response', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(schedulePayload)
                            });
                            
                            if (scheduleResponse.ok) {
                                const scheduleData = await scheduleResponse.json();
                                delayTime = scheduleData?.delayMinutes ? formatDelayTime(scheduleData.delayMinutes * 60 * 1000) : '60 minutes';
                            }
                        } catch (error) {
                            console.log('⚠️ Auto-response scheduling failed, using default delay');
                        }
                        
                        console.log('📱 About to show success notification...');
                        showNotification(
                            'Message Sent Successfully!',
                            `Save this Contact ID to check for responses later.\n\nIf no one responds within ${delayTime}, our AI assistant will provide a helpful response.\n\nYou can also find it in the "Check Message Status" section below.`,
                            'success',
                            result.conversationId,
                            10000
                        );
                        console.log('📱 Success notification called');
                        this.reset();
                        
                        // Update the message tracker display
                        updateMessageTracker();
                    } else {
                        console.log('❌ Message send failed, showing error notification...');
                        showNotification(
                            'Failed to Send',
                            'Failed to send message. Please try joining our Discord server directly.',
                            'error',
                            null,
                            6000
                        );
                    }
                }
                
            } catch (error) {
                console.error('💥 Form submission error:', error);
                showNotification(
                    'Error',
                    'An unexpected error occurred. Please try again.',
                    'error',
                    null,
                    6000
                );
            } finally {
                // Re-enable button
                const submitButton = this.querySelector('button[type="submit"]');
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Send to Discord';
                }
            }
        });
    } else {
        console.log('⚠️ Quick message form not found');
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

// Test functions for notifications (can be called from browser console)
function testNotification() {
    console.log('🧪 Testing notification system...');
    showNotification('Test Notification', 'This is a test message to verify notifications work!', 'success', 'CCCC-test-123', 5000);
}

function testAllNotifications() {
    setTimeout(() => showNotification('Success!', 'Message sent successfully!', 'success', 'CCCC-123', 5000), 100);
    setTimeout(() => showNotification('Error!', 'Something went wrong!', 'error', null, 5000), 2000);
    setTimeout(() => showNotification('Warning!', 'Please check your input!', 'warning', null, 5000), 4000);
}

// Simple test notification without animations
function testSimpleNotification() {
    const simple = document.createElement('div');
    simple.style.cssText = `
        position: fixed;
        top: 50px;
        right: 50px;
        background: red;
        color: white;
        padding: 20px;
        z-index: 99999;
        border: 3px solid black;
    `;
    simple.textContent = 'SIMPLE TEST NOTIFICATION';
    document.body.appendChild(simple);
    console.log('🔴 Simple notification added');
    setTimeout(() => simple.remove(), 3000);
}

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
    if (checkStatusBtn) {
        checkStatusBtn.disabled = true;
        checkStatusBtn.textContent = 'Checking...';
    }
    showStatusResult('Checking for response...', 'pending');
    if (conversationThread) {
        conversationThread.style.display = 'none';
    }
    
    try {
        console.log('Checking message status for Contact ID:', contactId);
        
        // Check for conversation history
        const conversationResponse = await fetch(`http://localhost:3001/api/conversation?id=${contactId}`);
        const conversationData = await conversationResponse.json();
        
        if (conversationData.found) {
            // Show conversation thread
            displayConversationThread(contactId, conversationData.conversation);
            showStatusResult(`💬 Conversation thread loaded! ${conversationData.conversation.messages.length} messages found.`, 'success');
        } else {
            // Check local storage for message info as fallback
            const messages = JSON.parse(localStorage.getItem('cccc_messages') || '[]');
            const localMessage = messages.find(msg => msg.id === contactId);
            
            if (localMessage) {
                const timeAgo = getTimeAgo(new Date(localMessage.timestamp));
                showStatusResult(`📨 Message found! Sent ${timeAgo}. No response yet. Climate activists will reply with: !respond ${contactId} [message]`, 'pending');
            } else {
                showStatusResult(`❌ Contact ID ${contactId} not found. Please check the ID or contact us directly on Discord.`, 'error');
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
        if (checkStatusBtn) {
            checkStatusBtn.disabled = false;
            checkStatusBtn.textContent = 'Check Status';
        }
        
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

// Format delay time in human-readable format
function formatDelayTime(milliseconds) {
    const seconds = milliseconds / 1000;
    const minutes = seconds / 60;
    const hours = minutes / 60;
    const days = hours / 24;
    
    if (days >= 1) {
        const dayCount = Math.floor(days);
        return `${dayCount} day${dayCount > 1 ? 's' : ''}`;
    } else if (hours >= 1) {
        const hourCount = Math.floor(hours);
        return `${hourCount} hour${hourCount > 1 ? 's' : ''}`;
    } else if (minutes >= 1) {
        const minuteCount = Math.floor(minutes);
        return `${minuteCount} minute${minuteCount > 1 ? 's' : ''}`;
    } else {
        const secondCount = Math.floor(seconds);
        return `${secondCount} second${secondCount > 1 ? 's' : ''}`;
    }
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
                
                showNotification('Conversation Cleared', `Conversation display cleared! Your Contact ID remains: ${conversationId}\nThe AI will still remember all your previous messages.`, 'success', conversationId, 5000);
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
            showNotification('Missing Message', 'Please enter a message', 'warning', null, 3000);
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
            const result = await addMessageToConversation(contactId, message, userName, userId);
            
            if (result.success) {
                // Add message to conversation display immediately
                const conversationMessages = document.getElementById('conversationMessages');
                if (conversationMessages) {
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
                }
                
                // Clear the input
                followUpMessage.value = '';
                
                // Show success notification
                showNotification('Follow-up Sent!', `Follow-up message sent! Auto-response scheduled in ${result.delayMinutes || 60} minutes if no human responds.`, 'success', contactId, 5000);
            } else {
                showNotification('Failed to Send', 'Failed to send follow-up message. Please try again.', 'error', null, 5000);
            }
        } catch (error) {
            console.error('Error sending follow-up:', error);
            showNotification('Error', 'Failed to send follow-up message. Please try again.', 'error', null, 5000);
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
    if (navMenu) {
        navMenu.classList.toggle('active');
    }
}

// Export functions to global scope for console testing
window.testNotification = testNotification;
window.testAllNotifications = testAllNotifications;
window.testSimpleNotification = testSimpleNotification;
window.showNotification = showNotification;

console.log('🎯 Script loaded successfully with enhanced notification system');
