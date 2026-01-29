# Claude Code Session Architecture

This document describes how Claude Code stores and connects sessions, plans, tasks, and related metadata.

## Overview

Claude Code uses a **UUID-based session system** where each conversation gets a unique identifier that connects all related artifacts:

```
Session UUID: d92c2f61-1896-443d-a0fc-19207dc7b483
                    │
                    ├─► Transcript (conversation history)
                    ├─► Tasks (progress tracking)
                    └─► Plan (referenced in transcript)
```

## Directory Structure

```
~/.claude/
├── projects/
│   └── <project-path-encoded>/
│       ├── sessions-index.json          # Session metadata & names
│       ├── <session-uuid-1>.jsonl       # Transcript file
│       ├── <session-uuid-2>.jsonl
│       └── ...
├── plans/
│   ├── fuzzy-meandering-moth.md         # Plan files (random names)
│   ├── goofy-riding-nova.md
│   └── ...
├── tasks/
│   └── <session-uuid>/
│       ├── .lock
│       ├── 1.json                       # Individual task files
│       ├── 2.json
│       └── ...
└── other folders...
```

## Component Details

### 1. Session Transcript

**Location:** `~/.claude/projects/<project-path>/<session-uuid>.jsonl`

- Contains the full conversation history in JSON Lines format
- One JSON object per line (messages, tool calls, results)
- Filename is the session UUID
- Never renamed by `/rename` command

### 2. Sessions Index

**Location:** `~/.claude/projects/<project-path>/sessions-index.json`

Contains metadata for all sessions in a project:

```json
{
  "version": 1,
  "entries": [
    {
      "sessionId": "d92c2f61-1896-443d-a0fc-19207dc7b483",
      "fullPath": "/home/user/.claude/projects/.../d92c2f61-...jsonl",
      "fileMtime": 1769684191257,
      "firstPrompt": "Implement the following plan...",
      "summary": "Practice Question Critic Implementation",
      "messageCount": 42,
      "created": "2026-01-29T10:43:29.183Z",
      "modified": "2026-01-29T11:55:00.000Z",
      "gitBranch": "main",
      "projectPath": "/home/user/code/project",
      "isSidechain": false
    }
  ]
}
```

**Key fields:**
| Field | Description |
|-------|-------------|
| `sessionId` | UUID (never changes) |
| `fullPath` | Path to transcript file |
| `summary` | Display name (updated by `/rename`) |
| `messageCount` | Number of messages in session |
| `gitBranch` | Git branch when session was active |
| `isSidechain` | True if forked via `/rewind` |

### 3. Tasks Folder

**Location:** `~/.claude/tasks/<session-uuid>/`

- Created on-demand when first task is created
- Folder name matches session UUID
- Contains individual JSON files per task

**Task file structure** (`1.json`, `2.json`, etc.):

```json
{
  "id": "1",
  "subject": "Create practice_question_critic_schema_models.py",
  "description": "Create Pydantic models for practice question critic results...",
  "activeForm": "Creating critic schema models",
  "status": "in_progress",
  "blocks": [],
  "blockedBy": []
}
```

**Task statuses:** `pending`, `in_progress`, `completed`

### 4. Plan Files

**Location:** `~/.claude/plans/<random-name>.md`

- Created during Plan Mode (`EnterPlanMode` tool)
- Uses random memorable names (e.g., `goofy-riding-nova.md`)
- Contains human-readable implementation plans in Markdown
- Referenced in the session transcript (not directly linked by UUID)

**How plans connect to sessions:**
- The plan filename is written into the transcript during plan mode
- When resuming, Claude Code reads the transcript and knows which plan was used
- No direct UUID linkage - connection is via transcript content

## The `/rename` Command

### What It Does

Changes the **display name** of a session for easier identification.

```bash
# During a session:
> /rename auth-refactor

# Later, resume by name:
$ claude --resume auth-refactor
```

### What Changes vs Stays the Same

| Component | Changes? | Details |
|-----------|----------|---------|
| Display name | YES | `summary` field in sessions-index.json |
| Session UUID | NO | Stays constant forever |
| Transcript file | NO | Filename remains `<uuid>.jsonl` |
| Tasks folder | NO | Folder remains `tasks/<uuid>/` |
| Plan file | NO | Still `<random-name>.md` |
| All connections | NO | Everything stays linked |

### How Rename Works Internally

1. User runs `/rename my-feature`
2. Claude Code finds current session in `sessions-index.json`
3. Updates the `summary` field from auto-generated to `"my-feature"`
4. Saves the index file
5. No files are renamed or moved

### Resuming Named Sessions

```bash
# By name (looks up UUID in sessions-index.json)
claude --resume my-feature

# By UUID (still works)
claude --resume d92c2f61-1896-443d-a0fc-19207dc7b483

# Interactive picker
claude /resume
# Then press 'R' on a session to rename it
```

## Session Lifecycle

```
1. Start new session
   └─► UUID generated: d92c2f61-...
   └─► Transcript created: projects/.../d92c2f61-...jsonl
   └─► Entry added to sessions-index.json

2. Enter plan mode (optional)
   └─► Plan file created: plans/goofy-riding-nova.md
   └─► Plan filename recorded in transcript

3. Create tasks (optional)
   └─► Tasks folder created: tasks/d92c2f61-.../
   └─► Task files: 1.json, 2.json, etc.

4. Rename session (optional)
   └─► sessions-index.json updated (summary field only)
   └─► Everything else unchanged

5. End session
   └─► Transcript finalized
   └─► sessions-index.json updated (messageCount, modified)

6. Resume session
   └─► Load transcript by UUID (or name lookup)
   └─► Tasks folder reconnected via UUID
   └─► Plan file known from transcript content
```

## Connection Diagram

```
sessions-index.json
        │
        │ contains
        ▼
┌─────────────────────────────────────────────────────────┐
│  Session Entry                                          │
│  ├── sessionId: "d92c2f61-..."  ◄─────────────────┐    │
│  ├── summary: "my-feature" (display name)          │    │
│  ├── fullPath ──────────────────────┐              │    │
│  └── ...                            │              │    │
└─────────────────────────────────────│──────────────│────┘
                                      │              │
                                      ▼              │
                            projects/<path>/         │
                            d92c2f61-...jsonl        │
                            (transcript)             │
                                      │              │
                                      │ references   │
                                      ▼              │
                            plans/                   │
                            goofy-riding-nova.md     │
                            (plan file)              │
                                                     │
                                                     │ same UUID
                                                     ▼
                                            tasks/d92c2f61-.../
                                            ├── 1.json
                                            ├── 2.json
                                            └── ...
                                            (task files)
```

## Tips

1. **Find session UUID**: Check `sessions-index.json` or the transcript filename
2. **Find tasks for a session**: Look in `~/.claude/tasks/<session-uuid>/`
3. **Find plan for a session**: Search transcript for `.md` references
4. **Safe to rename**: All connections are UUID-based, names are just labels
5. **Per-project sessions**: Each project directory has its own sessions-index

## Related Commands

| Command | Description |
|---------|-------------|
| `/rename <name>` | Rename current session |
| `/resume` | Interactive session picker |
| `claude --resume <name-or-uuid>` | Resume specific session |
| `/rewind` | Fork session (creates sidechain) |

---

*Document created: 2026-01-29*
*Based on Claude Code session analysis*
