#!/bin/bash

# Vector Similarity Explorer - Start Script
# Starts a local web server to run the application

PORT=3000
HOST="0.0.0.0"
NGROK_DOMAIN="will-node.ngrok.dev"

echo "🚀 Starting Vector Similarity Explorer..."
echo ""

# Check if port is already in use
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port $PORT is already in use!"
    echo ""
    echo "Options:"
    echo "1. Kill the process using port $PORT"
    echo "2. Use a different port"
    read -p "Enter choice (1 or 2): " choice

    if [ "$choice" = "1" ]; then
        echo "Killing process on port $PORT..."
        lsof -ti:$PORT | xargs kill -9 2>/dev/null
        sleep 1
    elif [ "$choice" = "2" ]; then
        read -p "Enter port number: " PORT
    else
        echo "Invalid choice. Exiting."
        exit 1
    fi
fi

# Get local IP address
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "Unable to detect IP")

echo "📡 Starting server on all network interfaces"
echo ""

# Start Python HTTP server in background
python3 -m http.server $PORT --bind $HOST &
SERVER_PID=$!

# Wait a moment for server to start
sleep 1

# Start ngrok tunnel
echo "🌐 Starting ngrok tunnel..."
ngrok http 3000 --domain=$NGROK_DOMAIN &
NGROK_PID=$!

# Wait for ngrok to initialize
sleep 2

echo ""
echo "✨ Access the app from:"
echo "   Local:    http://localhost:$PORT"
if [ "$LOCAL_IP" != "Unable to detect IP" ]; then
    echo "   Network:  http://$LOCAL_IP:$PORT"
fi
echo "   Public:   https://$NGROK_DOMAIN"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    echo "🛑 Stopping connection to ngrok tunnel..."
    kill $SERVER_PID 2>/dev/null
    kill $NGROK_PID 2>/dev/null
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Wait for both processes
wait
