#!/bin/bash

# Vector Similarity Explorer - Start Script
# Starts a local web server to run the application

PORT=3000
HOST="localhost"

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

echo "📡 Starting server on http://$HOST:$PORT"
echo ""
echo "✨ Open your browser and navigate to:"
echo "   http://$HOST:$PORT"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start Python HTTP server
python3 -m http.server $PORT
