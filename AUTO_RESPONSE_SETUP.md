# Auto-Response Setup Guide

## Overview
The CCCC website now includes an AI auto-response feature using Google's Gemini API that automatically responds to website messages if no human responds within 1 hour.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and add your API key:
   ```env
   # Discord Bot Configuration
   BOT_TOKEN=your_discord_bot_token_here

   # Gemini AI Configuration
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-1.5-flash

   # Auto-response Settings
   AUTO_RESPONSE_DELAY=3600000  # 1 hour in milliseconds
   ```

### 3. Get Your Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the key and paste it as `GEMINI_API_KEY` in your `.env` file

### 4. Start the Bot
```bash
npm start
```

## How It Works

1. **User sends message** → Website sends message to Discord via webhook
2. **Auto-response scheduled** → 1-hour timer starts automatically
3. **Human responds** → Timer is cancelled, human response is saved
4. **No human response** → After 1 hour, AI generates and saves a response
5. **User checks status** → Website shows either human or AI response

## Configuration Options

- **AUTO_RESPONSE_DELAY**: Time in milliseconds before AI responds (default: 3600000 = 1 hour)
- **GEMINI_MODEL**: Gemini model to use (default: gemini-1.5-flash)
- **GEMINI_API_KEY**: Your Google Gemini API key (required for auto-responses)

## AI Response Behavior

The AI assistant:
- Provides supportive, climate-focused responses
- Encourages climate action and involvement
- Keeps responses under 200 words
- Identifies as "CCCC AI Assistant" in the responder field
- Falls back to a generic encouraging message if the API fails

## Testing

1. Send a test message via the website
2. Wait for the configured delay (or temporarily reduce AUTO_RESPONSE_DELAY for testing)
3. Check the message status to see the AI response

## Troubleshooting

- **Auto-responses not working**: Check that GEMINI_API_KEY is set correctly
- **API errors**: Verify your Google AI Studio account has API access enabled
- **Bot offline**: Ensure the Discord bot token is valid and the bot is running
- **Gemini quota exceeded**: Check your API usage limits in Google AI Studio