# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Obeya is a visual management dashboard for tracking Claude Code projects, sessions, plans, and tasks. It captures events via Claude Code hooks and displays them in a real-time Vue dashboard with Kanban-style task boards.

## Architecture

```
Claude Code CLI → Hook Scripts (Python) → HTTP POST → Obeya Server (Node.js) → SQLite → WebSocket → Vue Client
```

**Components:**
- `obeya/server/` - Node.js TypeScript server (port 4001)
- `obeya/client/` - Vue 3 frontend (port 5174)
- `obeya/hooks/` - Python hook script for capturing Claude Code events
- `.claude/settings.json` - Hook configuration for event capture

## Commands

### Server
```bash
cd obeya/server
npm run dev          # Start with hot reload (tsx watch)
npm run start        # Start production server
npm run dev:bun      # Start with Bun runtime
```

### Client
```bash
cd obeya/client
npm run dev          # Start Vite dev server
npm run build        # Build for production
```

### Full System
```bash
./obeya/scripts/start.sh   # Start both server and client
```

## Server Structure

```
src/
├── index.ts        # HTTP server, event processing, CORS
├── db.ts           # SQLite with better-sqlite3, all CRUD operations
├── types.ts        # TypeScript interfaces
├── websocket.ts    # WebSocket broadcast to connected clients
└── api/
    ├── projects.ts   # /api/projects endpoints
    ├── sessions.ts   # /api/sessions/:uuid endpoints
    ├── plans.ts      # /api/sessions/:uuid/plans
    ├── tasks.ts      # /api/sessions/:uuid/tasks
    └── dashboard.ts  # /api/dashboard/overview
```

## Database Schema

SQLite database (`obeya.db`) with tables:
- **projects** - Tracked by GitHub repo or project path
- **sessions** - Claude Code sessions linked to projects
- **plans** - Plan mode documents within sessions
- **tasks** - Tasks with status (pending/in_progress/completed) and dependencies
- **events** - Raw hook events for audit trail

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/events` | POST | Receive hook events from Claude Code |
| `/health` | GET | Server health and WebSocket client count |
| `/api/projects` | GET | List projects (add `?stats=true` for counts) |
| `/api/projects/:id/sessions` | GET | Sessions for a project |
| `/api/sessions/:uuid?details=true` | GET | Session with plans and tasks |
| `/api/dashboard/overview` | GET | Aggregated stats for Obeya board |
| `/stream` | WS | Real-time event broadcast |

## Hook Events Captured

The Python hook script (`obeya/hooks/obeya_hook.py`) captures:
- `SessionStart` / `SessionEnd` - Session lifecycle
- `SubagentStart` / `SubagentStop` - Plan mode detection
- `PreToolUse` (Write to `.claude/plans/`) - Plan file creation
- `PreToolUse` / `PostToolUse` (TaskCreate/TaskUpdate/TaskList) - Task operations

## Key Patterns

**Upsert pattern**: All database operations use upsert logic - create if not exists, update if exists.

**Real-time updates**: Events received at `/events` are stored in SQLite and immediately broadcast via WebSocket to all connected Vue clients.

**Project identification**: Projects are uniquely identified by `project_path`. GitHub repo is extracted via `git remote get-url origin` when available.

## Environment Variables

- `OBEYA_PORT` - Server port (default: 4001)
- `OBEYA_SERVER_URL` - Server URL for hook script (default: http://localhost:4001)

## Code Quality Rules

- Files > 500 lines: refactor into utility modules
- Functions > 50 lines: extract helper functions
- No fallback mechanisms: fail fast with detailed error logging
- Throw exceptions instead of silent failures
