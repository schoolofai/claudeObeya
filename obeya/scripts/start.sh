#!/bin/bash
# Obeya Dashboard Startup Script
# Starts both the server and client in parallel

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OBEYA_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Obeya Dashboard...${NC}"
echo ""

# Detect package manager (prefer bun, fallback to npm)
if command -v bun &> /dev/null; then
    PKG_MANAGER="bun"
    RUN_CMD="bun run"
elif command -v npm &> /dev/null; then
    PKG_MANAGER="npm"
    RUN_CMD="npm run"
else
    echo -e "${RED}Error: Neither bun nor npm is installed${NC}"
    echo "Install bun from https://bun.sh or npm from https://nodejs.org"
    exit 1
fi

echo -e "${BLUE}Using package manager: ${PKG_MANAGER}${NC}"

# Install server dependencies if needed
if [ ! -d "$OBEYA_DIR/server/node_modules" ]; then
    echo -e "${BLUE}Installing server dependencies...${NC}"
    (cd "$OBEYA_DIR/server" && $PKG_MANAGER install)
fi

# Install client dependencies if needed
if [ ! -d "$OBEYA_DIR/client/node_modules" ]; then
    echo -e "${BLUE}Installing client dependencies...${NC}"
    (cd "$OBEYA_DIR/client" && $PKG_MANAGER install)
fi

echo ""
echo -e "${GREEN}Starting services...${NC}"
echo ""

# Function to cleanup background processes
cleanup() {
    echo ""
    echo -e "${BLUE}Shutting down Obeya Dashboard...${NC}"
    kill $SERVER_PID 2>/dev/null
    kill $CLIENT_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start server in background
echo -e "${BLUE}[Server]${NC} Starting on port 4001..."
(cd "$OBEYA_DIR/server" && $RUN_CMD dev) &
SERVER_PID=$!

# Give server a moment to start
sleep 2

# Start client in background
echo -e "${BLUE}[Client]${NC} Starting on port 5174..."
(cd "$OBEYA_DIR/client" && $RUN_CMD dev) &
CLIENT_PID=$!

echo ""
echo -e "${GREEN}Obeya Dashboard is running!${NC}"
echo ""
echo -e "  ${BLUE}Dashboard:${NC} http://localhost:5174"
echo -e "  ${BLUE}API:${NC}       http://localhost:4001"
echo -e "  ${BLUE}WebSocket:${NC} ws://localhost:4001/stream"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Wait for either process to exit
wait $SERVER_PID $CLIENT_PID
