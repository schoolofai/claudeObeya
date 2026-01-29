# Obeya - Claude Code Visual Management Dashboard

Obeya is a real-time visual management dashboard for tracking Claude Code sessions, plans, and tasks. It captures events via Claude Code hooks and displays them in a Vue dashboard with Kanban-style task boards.

## Architecture

```
Claude Code CLI → Hook Scripts (Python) → HTTP POST → Obeya Server (Node.js) → SQLite → WebSocket → Vue Client
```

## Prerequisites

- **Node.js** 18+ or **Bun** runtime
- **Python 3.8+** with `uv` package manager (for hooks)
- **Claude Code CLI** installed and configured

### Install uv (Python package manager)

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or with Homebrew
brew install uv
```

## Quick Start

### 1. Clone the Repository

```bash
git clone <repo-url> claudeObeya
cd claudeObeya
```

### 2. Install Dependencies

```bash
# Server
cd obeya/server
npm install   # or: bun install

# Client
cd ../client
npm install   # or: bun install
```

### 3. Start the System

**Option A: Use the start script (recommended)**

```bash
./obeya/scripts/start.sh
```

This starts both server and client with automatic dependency installation.

**Option B: Start manually in separate terminals**

Terminal 1 - Server:
```bash
cd obeya/server
npm run dev      # or: bun run dev
```

Terminal 2 - Client:
```bash
cd obeya/client
npm run dev      # or: bun run dev
```

### 4. Access the Dashboard

- **Dashboard UI**: http://localhost:5174
- **API Server**: http://localhost:4001
- **Health Check**: http://localhost:4001/health

## Setting Up Hooks

The hooks capture Claude Code events and send them to the Obeya server.

### IMPORTANT: Start Claude Code from the project directory

For hooks to work correctly, you must start Claude Code from within the `claudeObeya` directory:

```bash
cd /path/to/claudeObeya
claude
```

The hooks use `$CLAUDE_PROJECT_DIR` which is set based on where you start Claude Code.

### Hook Configuration

The hooks are configured in `.claude/settings.json` and capture:

| Event | Description |
|-------|-------------|
| `SessionStart` | New Claude Code session begins |
| `SessionEnd` | Session ends |
| `SubagentStart` | Plan mode or subagent starts |
| `SubagentStop` | Plan mode or subagent ends |
| `PreToolUse` | Before Write/Read/Task tools execute |
| `PostToolUse` | After Task tools complete |

### Verify Hooks are Working

1. Start the Obeya server
2. Start Claude Code from the project directory
3. Check server logs for incoming events
4. Check dashboard for session appearing

## Project Structure

```
claudeObeya/
├── .claude/
│   └── settings.json     # Hook configuration
├── obeya/
│   ├── server/           # Node.js backend
│   │   ├── src/
│   │   │   ├── index.ts      # HTTP server & event processing
│   │   │   ├── db.ts         # SQLite database operations
│   │   │   ├── websocket.ts  # Real-time updates
│   │   │   └── api/          # REST API endpoints
│   │   └── obeya.db          # SQLite database (created on first run)
│   ├── client/           # Vue 3 frontend
│   │   └── src/
│   │       ├── App.vue
│   │       └── components/
│   ├── hooks/            # Python hook scripts
│   │   └── obeya_hook.py
│   └── scripts/
│       └── start.sh      # Combined startup script
└── README.md
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/events` | POST | Receive hook events from Claude Code |
| `/health` | GET | Server health and WebSocket client count |
| `/api/projects` | GET | List all projects |
| `/api/projects?stats=true` | GET | Projects with session/task counts |
| `/api/projects/:id/sessions` | GET | Sessions for a project |
| `/api/sessions/:uuid` | GET | Session details |
| `/api/sessions/:uuid?details=true` | GET | Session with plans and tasks |
| `/api/sessions/:uuid/plans` | GET | Plans for a session |
| `/api/sessions/:uuid/tasks` | GET | Tasks for a session |
| `/api/dashboard/overview` | GET | Aggregated dashboard stats |

## WebSocket Events

Connect to `ws://localhost:4001/stream` to receive real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:4001/stream');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Event:', data.type, data.payload);
};
```

Event types broadcasted:
- `session_start` / `session_end`
- `plan_created` / `plan_updated`
- `task_created` / `task_updated`
- `event_received`

## Troubleshooting

### Sessions not appearing in dashboard

1. **Check you started Claude Code from the right directory**
   ```bash
   cd /path/to/claudeObeya
   claude
   ```

2. **Verify server is running**
   ```bash
   curl http://localhost:4001/health
   ```

3. **Check hook script permissions**
   ```bash
   chmod +x obeya/hooks/obeya_hook.py
   ```

4. **Test hook manually**
   ```bash
   echo '{"event_type":"test"}' | CLAUDE_SESSION_ID="test-123" uv run obeya/hooks/obeya_hook.py
   ```

### Database issues

Reset the database:
```bash
rm obeya/server/obeya.db*
# Restart the server - it will recreate the database
```

### Port conflicts

Change ports via environment variables:
```bash
OBEYA_PORT=4002 npm run dev         # Server
VITE_PORT=5175 npm run dev          # Client (or edit vite.config.ts)
```

## Development

### Server (with hot reload)
```bash
cd obeya/server
npm run dev
```

### Client (with hot reload)
```bash
cd obeya/client
npm run dev
```

### Build for production
```bash
cd obeya/client
npm run build
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OBEYA_PORT` | 4001 | Server port |
| `OBEYA_SERVER_URL` | http://localhost:4001 | Server URL for hook script |

## License

MIT
