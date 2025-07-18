#!/bin/bash

# CCCC System Startup Script
echo "🌍 Starting CCCC Website & Discord Bot System..."

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Wait a moment for cleanup
sleep 2

# Start the Discord bot and API server
echo "🤖 Starting Discord bot and API server on port 3001..."
node bot.js &
BOT_PID=$!

# Wait for bot to initialize
sleep 3

# Start the web server
echo "🌐 Starting web server on port 8000..."
python3 -m http.server 8000 &
WEB_PID=$!

# Wait for everything to start
sleep 2

echo ""
echo "✅ CCCC System is now running!"
echo ""
echo "🌐 Website: http://localhost:8000"
echo "🤖 Bot API: http://localhost:3001"
echo "📱 Community Page: http://localhost:8000/community.html"
echo "🧪 Test Page: http://localhost:8000/test-notifications.html"
echo ""
echo "📋 Bot Status:"
curl -s http://localhost:3001/api/health | python3 -m json.tool
echo ""
echo "🛑 To stop the system, press Ctrl+C"
echo ""

# Function to cleanup when script is terminated
cleanup() {
    echo ""
    echo "🛑 Shutting down CCCC system..."
    kill $BOT_PID 2>/dev/null || true
    kill $WEB_PID 2>/dev/null || true
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    echo "✅ System shutdown complete"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Keep script running
while true; do
    sleep 1
done