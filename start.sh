#!/bin/bash

echo "🚀 Starting CCCC Website and Bot..."

# Kill existing processes if they exist
echo "🧹 Cleaning up existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

sleep 1

# Start the Discord bot in background
echo "📱 Starting Discord bot..."
node bot.js &
BOT_PID=$!

sleep 2

# Start the website server
echo "🌐 Starting website on http://localhost:8000"
python3 -m http.server 8000 &
WEB_PID=$!

echo "✅ Both services started!"
echo "🌐 Website: http://localhost:8000"
echo "🤖 Bot API: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both services"

# Wait for interrupt
trap "echo '🛑 Stopping services...'; kill $BOT_PID $WEB_PID 2>/dev/null; exit" INT
wait