# CCCC Website & Discord Bot

A complete web application and Discord bot system for the Children's Climate Change Committee (CCCC), featuring AI-powered auto-responses, conversation threading, and seamless Discord integration.

## What is CCCC?

The **Children's Climate Change Committee (CCCC)** is an organization dedicated to empowering young people to lead the fight against climate change. Through education, advocacy, and community action, CCCC gives children and teens the tools and platform they need to create meaningful environmental change.

**Our Mission:** Every child deserves a voice in securing their future. We believe that young people are not just the leaders of tomorrow, but the changemakers of today.

## What This System Does

This project provides:

### 🌐 **Interactive Website**
- Multi-page responsive website (Home, About, Services, Community, Contact)
- Real-time Discord server integration showing online members
- Message submission system with persistent user identity
- Live conversation threading with auto-refresh every 10 seconds
- Message status tracking and response notifications
- **Enhanced Center-Screen Notification System** with pulsing effects and animations
- **Offline Fallback Support** - notifications work even when backend is down

### 🤖 **Intelligent Discord Bot**
- Automatic message forwarding from website to Discord
- AI-powered auto-responses using Google Gemini API (1-hour delay)
- Conversation history tracking across all user interactions
- Human response detection and auto-response cancellation
- Complete conversation threading with context awareness

### 🔧 **Key Features**
- **Persistent User Identity**: Same user always gets the same ID for conversation continuity
- **Smart Auto-Response**: AI only responds if no human replies within 1 hour
- **Live Updates**: Website automatically refreshes to show new responses
- **Conversation History**: AI remembers all previous messages from each user
- **Discord Integration**: Seamless webhook integration for real-time notifications

## Setup Instructions

### Prerequisites
- Node.js 18+ (for built-in fetch support)
- Discord Bot Token
- Discord Webhook URL
- Google Gemini API Key (optional, for AI responses)

### 1. Clone and Install
```bash
git clone <repository-url>
cd CCCC
npm install
```

### 2. Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your actual credentials:
```env
# Discord Bot Configuration
BOT_TOKEN=your_discord_bot_token_here
GUILD_ID=your_discord_guild_id_here
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN

# Gemini AI Configuration (optional)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# Auto-response Settings
AUTO_RESPONSE_DELAY=3600000  # 1 hour in milliseconds
```

### 3. Discord Setup
1. Create a Discord application at https://discord.com/developers/applications
2. Create a bot and copy the bot token
3. Invite the bot to your server with appropriate permissions
4. Create a webhook in your Discord server channel
5. Copy the webhook URL

### 4. Start the System
```bash
# Start both website and bot (recommended)
./start-system.sh

# Or start manually:
# Terminal 1: Start the bot
node bot.js

# Terminal 2: Start the website
python3 -m http.server 8000
```

The system will be available at:
- 🌐 Website: http://localhost:8000
- 🤖 Bot API: http://localhost:3001

## How to Modify

### Website Content
- **Pages**: Edit HTML files (`index.html`, `about.html`, etc.)
- **Styling**: Modify `styles.css`
- **JavaScript**: Edit `script.js` for frontend functionality
- **Logo**: Replace `logo.svg`

### Bot Configuration
- **Main logic**: Edit `bot.js`
- **AI responses**: Modify the `generateAIResponse` function
- **Auto-response delay**: Change `AUTO_RESPONSE_DELAY` in `.env`
- **Discord commands**: Add new commands in the `messageCreate` event handler

### Discord Integration
- **Webhook format**: Modify webhook payload in `bot.js`
- **Response commands**: Edit the `!respond` command logic
- **Server info**: Update Guild ID and webhook URL in `.env`

### Database/Storage
The system uses JSON files for data persistence:
- `responses.json` - Bot responses
- `conversations.json` - Conversation threads
- `user_history.json` - Complete user message history
- `pending.json` - Scheduled auto-responses

## File Structure
```
CCCC/
├── README.md                 # This file
├── package.json             # Dependencies
├── .env.example             # Environment template
├── .gitignore              # Git ignore rules
├── start.sh                # Startup script
├── bot.js                  # Discord bot & API server
├── script.js               # Frontend JavaScript
├── styles.css              # Website styling
├── logo.svg                # CCCC logo
├── index.html              # Homepage
├── about.html              # About page
├── services.html           # Services page
├── community.html          # Community page (main interaction)
├── contact.html            # Contact page
└── AUTO_RESPONSE_SETUP.md  # AI setup documentation
```

## API Endpoints

The bot provides a REST API on port 3001:
- `GET /api/health` - Bot status
- `GET /api/response?id=CONTACT_ID` - Check for response
- `GET /api/conversation?id=CONVERSATION_ID` - Get conversation history
- `POST /api/send-webhook` - Send message to Discord
- `POST /api/add-message` - Add message to existing conversation
- `POST /api/schedule-response` - Schedule AI auto-response

## Discord Commands

- `!respond CONTACT_ID Your message here` - Reply to a website message
- `!help` - Show bot commands
- `!stats` - Show response statistics
- `!list` - Show recent responses

## Security Notes

- Never commit `.env` file (it's git-ignored)
- All sensitive data is stored in environment variables
- Bot tokens and API keys are not hardcoded
- Webhook URLs are configurable via environment variables

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues or questions:
- Check the GitHub issues page
- Join our Discord community
- Review the `AUTO_RESPONSE_SETUP.md` for AI configuration

---

**Built with ❤️ for climate action by young changemakers**
