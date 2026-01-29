#!/usr/bin/env -S uv run --script
# /// script
# dependencies = []
# ///
"""
Obeya Hook Script for Claude Code
Captures session, plan, and task events and sends them to the Obeya server.
"""

import json
import os
import subprocess
import sys
import urllib.request
from datetime import datetime

OBEYA_SERVER = os.getenv('OBEYA_SERVER_URL', 'http://localhost:4001')
LOG_FILE = '/tmp/obeya_hook.log'
DEBUG = os.getenv('OBEYA_DEBUG', '1') == '1'


def log(message: str, level: str = 'INFO') -> None:
    """Log message to file with timestamp."""
    try:
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
        log_line = f"[{timestamp}] [{level}] {message}\n"
        with open(LOG_FILE, 'a') as f:
            f.write(log_line)
    except Exception:
        pass


def main() -> None:
    try:
        raw_input = sys.stdin.read()
        log(f"=== HOOK TRIGGERED ===")
        log(f"Raw input length: {len(raw_input)} bytes")

        input_data = json.loads(raw_input)
        hook_event = input_data.get('hook_event_name', '')
        session_id = input_data.get('session_id', '')
        tool_name = input_data.get('tool_name', '')

        log(f"Hook: {hook_event} | Session: {session_id[:8] if session_id else 'N/A'}... | Tool: {tool_name or 'N/A'}")

        if DEBUG:
            log(f"Full input_data keys: {list(input_data.keys())}")
            # Check for slug field specifically
            if 'slug' in input_data:
                log(f"SLUG FOUND: {input_data['slug']}")
            else:
                log(f"No slug field in input_data")

    except json.JSONDecodeError as e:
        log(f"Failed to parse stdin JSON: {e}", 'ERROR')
        sys.exit(0)

    project_path = extract_project_path(input_data)
    github_repo = get_github_repo(project_path)

    log(f"Project: {project_path} | Repo: {github_repo or 'N/A'}")

    event = {
        'source_app': 'obeya',
        'session_id': session_id,
        'hook_event_type': hook_event,
        'timestamp': int(datetime.now().timestamp() * 1000),
        'payload': {
            'project_path': project_path,
            'github_repo': github_repo,
        }
    }

    # Always try to get session data from sessions-index.json
    # This ensures we capture summary/firstPrompt even if it wasn't available at SessionStart
    transcript_path = input_data.get('transcript_path', '')
    session_data = get_session_data_from_index(session_id, transcript_path)
    if session_data:
        event['payload']['session_summary_update'] = {
            'summary': session_data.get('summary'),
            'first_prompt': session_data.get('first_prompt'),
        }
        if session_data.get('summary'):
            log(f"Including session summary in event: {session_data['summary'][:50]}...")
        if session_data.get('first_prompt'):
            log(f"Including first_prompt in event: {session_data['first_prompt'][:50]}...")

    # Extract plan slug - first try input, then transcript file
    plan_slug = input_data.get('slug', '')
    if not plan_slug:
        # Try to extract from transcript file
        transcript_path = input_data.get('transcript_path', '')
        plan_slug = extract_plan_slug_from_transcript(transcript_path)

    if plan_slug:
        log(f"Plan slug detected: {plan_slug}")
        plan_path = os.path.expanduser(f'~/.claude/plans/{plan_slug}.md')
        # Associate the plan with this session
        event['payload']['plan_event'] = {
            'type': 'plan_associated',
            'plan_name': plan_slug,
            'plan_path': plan_path,
        }

    # Session events
    if hook_event == 'SessionStart':
        session_data = extract_session_data(input_data)
        summary = session_data.get('summary') if session_data else None
        first_prompt = session_data.get('first_prompt') if session_data else None
        git_branch = get_git_branch(project_path)
        source = input_data.get('source', 'unknown')  # 'startup', 'resume', 'clear'
        event['payload']['session_event'] = {
            'type': 'session_start',
            'source': source,
            'summary': summary,
            'first_prompt': first_prompt,
            'git_branch': git_branch,
            'model_name': input_data.get('model_name'),
            'plan_slug': plan_slug if plan_slug else None,  # Include plan slug in session event
        }
        log(f"SessionStart: source={source}, summary={summary}, first_prompt={first_prompt[:50] if first_prompt else None}..., branch={git_branch}, plan_slug={plan_slug or 'None'}")

    if hook_event == 'SessionEnd':
        event['payload']['session_event'] = {
            'type': 'session_end',
        }
        log("SessionEnd captured")

    # Plan events
    if hook_event == 'SubagentStart':
        agent_type = input_data.get('agent_type', '')
        log(f"SubagentStart: agent_type={agent_type}")
        if agent_type == 'Plan':
            event['payload']['plan_event'] = {
                'type': 'plan_started',
                'session_id': session_id,
            }

    if hook_event == 'SubagentStop':
        agent_type = input_data.get('agent_type', '')
        transcript_path = input_data.get('agent_transcript_path', '')
        log(f"SubagentStop: agent_type={agent_type}, transcript={transcript_path}")
        plan_info = extract_plan_from_transcript(transcript_path)
        if plan_info:
            event['payload']['plan_event'] = {
                'type': 'plan_completed',
                'plan_name': plan_info['name'],
                'plan_path': plan_info['path'],
            }
            log(f"Plan completed: {plan_info['name']}")

    # Plan file creation via Write (PreToolUse)
    if hook_event == 'PreToolUse' and tool_name == 'Write':
        file_path = input_data.get('tool_input', {}).get('file_path', '')
        if '/.claude/plans/' in file_path and file_path.endswith('.md'):
            plan_name = os.path.basename(file_path).replace('.md', '')
            event['payload']['plan_event'] = {
                'type': 'plan_file_created',
                'plan_name': plan_name,
                'plan_path': file_path,
            }
            log(f"Plan file created: {plan_name}")

    # Plan content update via Write (PostToolUse) - captures the actual content
    if hook_event == 'PostToolUse' and tool_name == 'Write':
        file_path = input_data.get('tool_input', {}).get('file_path', '')
        if '/.claude/plans/' in file_path and file_path.endswith('.md'):
            plan_name = os.path.basename(file_path).replace('.md', '')
            plan_content = input_data.get('tool_input', {}).get('content')

            if plan_content:
                event['payload']['plan_event'] = {
                    'type': 'plan_content_updated',
                    'plan_name': plan_name,
                    'plan_path': file_path,
                    'plan_content': plan_content,
                }
                log(f"Plan content updated: {plan_name} ({len(plan_content)} chars)")

    # Plan file read via Read - tracks when session uses an existing plan
    if hook_event == 'PreToolUse' and tool_name == 'Read':
        file_path = input_data.get('tool_input', {}).get('file_path', '')
        if '/.claude/plans/' in file_path and file_path.endswith('.md'):
            plan_name = os.path.basename(file_path).replace('.md', '')
            event['payload']['plan_event'] = {
                'type': 'plan_file_read',
                'plan_name': plan_name,
                'plan_path': file_path,
            }
            log(f"Plan file read (linking to session): {plan_name}")

    # ExitPlanMode - marks plan as completed
    if tool_name == 'ExitPlanMode':
        log(f"ExitPlanMode detected")
        # Try to find plan from transcript or recent Write events
        transcript_path = input_data.get('transcript_path', '')
        plan_info = extract_plan_from_transcript(transcript_path)
        if plan_info:
            event['payload']['plan_event'] = {
                'type': 'plan_completed',
                'plan_name': plan_info['name'],
                'plan_path': plan_info['path'],
            }
            log(f"Plan completed via ExitPlanMode: {plan_info['name']}")

    # Task events
    if tool_name in ['TaskCreate', 'TaskUpdate', 'TaskList', 'TaskGet']:
        tool_input = input_data.get('tool_input', {})
        # NOTE: Claude Code uses 'tool_response' for PostToolUse, not 'tool_result'
        tool_response = input_data.get('tool_response', {})

        log(f"Task tool: {tool_name}")
        log(f"  tool_input: {json.dumps(tool_input)}")

        if hook_event == 'PostToolUse':
            log(f"  tool_response type: {type(tool_response).__name__}")
            if isinstance(tool_response, dict):
                log(f"  tool_response (dict): {json.dumps(tool_response)[:500]}...")
            elif isinstance(tool_response, str):
                log(f"  tool_response (str): {tool_response[:200]}...")

        # Extract task details from tool_input
        task_id = tool_input.get('taskId') or tool_input.get('task_id')
        subject = tool_input.get('subject', '')
        description = tool_input.get('description', '')
        active_form = tool_input.get('activeForm', '')
        status = tool_input.get('status', 'pending')

        task_event = {
            'type': f'task_{tool_name.lower().replace("task", "")}',
            'task_id': task_id,
            'task': {
                'taskId': task_id,
                'subject': subject,
                'description': description,
                'activeForm': active_form,
                'status': status,
                'blockedBy': tool_input.get('addBlockedBy', []),
                'blocks': tool_input.get('addBlocks', []),
            },
        }

        # For PostToolUse, extract task ID and subject from tool_response
        if hook_event == 'PostToolUse' and tool_response:
            import re

            # Handle dict response - check for 'task' field first (Claude Code format)
            if isinstance(tool_response, dict):
                task_obj = tool_response.get('task', {})
                if isinstance(task_obj, dict):
                    # Extract id from task object
                    extracted_id = task_obj.get('id')
                    if extracted_id:
                        task_event['task_id'] = str(extracted_id)
                        task_event['task']['taskId'] = str(extracted_id)
                        log(f"  Extracted task_id from response.task.id: {extracted_id}")

                    # Extract subject from task object if not already set
                    extracted_subject = task_obj.get('subject')
                    if extracted_subject and not task_event['task']['subject']:
                        task_event['task']['subject'] = extracted_subject
                        log(f"  Extracted subject from response.task.subject: {extracted_subject[:50]}...")

                    # Extract status if available
                    extracted_status = task_obj.get('status')
                    if extracted_status:
                        task_event['task']['status'] = extracted_status
                        log(f"  Extracted status from response.task.status: {extracted_status}")

            task_event['result'] = tool_response

        log(f"  Final: id={task_event['task']['taskId']}, subject={task_event['task']['subject'][:50] if task_event['task']['subject'] else 'NONE'}...")
        event['payload']['task_event'] = task_event

    send_event(event)
    log(f"Event sent successfully to {OBEYA_SERVER}")
    log("=== HOOK COMPLETE ===\n")
    sys.exit(0)


def extract_project_path(data: dict) -> str:
    transcript_path = data.get('transcript_path', '')
    if 'projects/' in transcript_path:
        try:
            parts = transcript_path.split('projects/')[1].split('/')
            if parts:
                encoded = parts[0]
                decoded = encoded.replace('-', '/')
                if not decoded.startswith('/'):
                    decoded = '/' + decoded
                if os.path.isdir(decoded):
                    return decoded
        except (IndexError, ValueError):
            pass

    cwd = data.get('cwd', os.getcwd())
    return cwd


def get_sessions_index_path_from_transcript(transcript_path: str) -> str:
    """Derive sessions-index.json path from transcript_path.

    transcript_path: ~/.claude/projects/-Users-.../session_id.jsonl
    sessions-index.json is in the same directory
    """
    transcript_path = os.path.expanduser(transcript_path)
    project_dir = os.path.dirname(transcript_path)
    return os.path.join(project_dir, 'sessions-index.json')


def get_session_data_from_index(session_id: str, transcript_path: str) -> dict | None:
    """Read summary and firstPrompt from sessions-index.json for given session.

    Falls back to extracting first_prompt from transcript file if session
    is not found in the index (e.g., headless sessions with --print flag).

    Returns dict with 'summary' and 'first_prompt' keys, or None if not found.
    """
    if not transcript_path or not session_id:
        return None

    index_path = get_sessions_index_path_from_transcript(transcript_path)
    log(f"Looking for sessions-index.json at: {index_path}")

    found_in_index = False

    if os.path.exists(index_path):
        try:
            with open(index_path, 'r') as f:
                index_data = json.load(f)

            for entry in index_data.get('entries', []):
                if entry.get('sessionId') == session_id:
                    summary = entry.get('summary')
                    first_prompt = entry.get('firstPrompt')
                    log(f"Found session {session_id[:8]}... in index: summary={summary}, first_prompt={first_prompt[:50] if first_prompt else None}...")
                    found_in_index = True
                    return {
                        'summary': summary,
                        'first_prompt': first_prompt,
                    }

            log(f"Session {session_id[:8]}... not found in sessions-index.json", 'WARN')
        except json.JSONDecodeError as e:
            log(f"Failed to parse sessions-index.json: {e}", 'ERROR')
            raise  # Fast fail per user preference
        except (FileNotFoundError, PermissionError) as e:
            log(f"Failed to read sessions-index.json: {e}", 'ERROR')
            raise  # Fast fail per user preference
    else:
        log(f"sessions-index.json not found at: {index_path}", 'WARN')

    # Fallback: Extract first_prompt directly from transcript file
    # This handles headless sessions that aren't in sessions-index.json
    if not found_in_index:
        log(f"Attempting transcript fallback for session {session_id[:8]}...")
        first_prompt = get_first_prompt_from_transcript(transcript_path)
        if first_prompt:
            log(f"Using transcript fallback for first_prompt: {first_prompt[:50]}...")
            return {
                'summary': None,  # Summary not available from transcript
                'first_prompt': first_prompt,
            }

    return None


def extract_session_data(data: dict) -> dict | None:
    """Extract session summary and firstPrompt from sessions-index.json using transcript_path."""
    session_id = data.get('session_id', '')
    transcript_path = data.get('transcript_path', '')

    # Try to get data from sessions-index.json (authoritative source)
    return get_session_data_from_index(session_id, transcript_path)


def extract_plan_slug_from_transcript(transcript_path: str) -> str | None:
    """Extract plan slug from the transcript file.

    Claude Code includes 'slug' field in transcript entries when a session is associated with a plan.
    """
    if not transcript_path:
        return None

    transcript_path = os.path.expanduser(transcript_path)
    if not os.path.exists(transcript_path):
        log(f"Transcript file not found: {transcript_path}", 'WARN')
        return None

    try:
        with open(transcript_path, 'r') as f:
            # Read first few lines to find slug (usually in early entries)
            for i, line in enumerate(f):
                if i > 10:  # Only check first 10 lines
                    break
                try:
                    entry = json.loads(line)
                    slug = entry.get('slug')
                    if slug:
                        log(f"Found plan slug in transcript: {slug}")
                        return slug
                except json.JSONDecodeError:
                    continue
    except (FileNotFoundError, PermissionError) as e:
        log(f"Failed to read transcript: {e}", 'ERROR')

    return None


def get_first_prompt_from_transcript(transcript_path: str) -> str | None:
    """Extract first user message from transcript file.

    Used as fallback when session is not yet in sessions-index.json
    (e.g., headless mode sessions started with --print flag).

    Transcript format (JSONL):
    {"type":"user","message":{"role":"user","content":"<first prompt>"}}

    Args:
        transcript_path: Path to the session transcript .jsonl file

    Returns:
        First user prompt (truncated to 500 chars) or None if not found

    Raises:
        json.JSONDecodeError: If transcript contains invalid JSON (fast fail)
        FileNotFoundError: If transcript file doesn't exist (fast fail)
        PermissionError: If transcript file can't be read (fast fail)
    """
    if not transcript_path:
        return None

    transcript_path = os.path.expanduser(transcript_path)

    if not os.path.exists(transcript_path):
        log(f"Transcript file not found for first_prompt extraction: {transcript_path}", 'WARN')
        return None

    try:
        with open(transcript_path, 'r') as f:
            for line in f:
                try:
                    entry = json.loads(line)

                    # Look for user message type
                    if entry.get('type') == 'user':
                        message = entry.get('message', {})
                        if message.get('role') == 'user':
                            content = message.get('content', '')

                            # Handle string content (simple prompt)
                            if isinstance(content, str) and content:
                                log(f"Extracted first_prompt from transcript: {content[:50]}...")
                                return content[:500]  # Truncate for safety

                            # Handle array content (tool results, multipart messages)
                            elif isinstance(content, list):
                                for item in content:
                                    if isinstance(item, dict) and item.get('type') == 'text':
                                        text = item.get('text', '')
                                        if text:
                                            log(f"Extracted first_prompt from transcript (array): {text[:50]}...")
                                            return text[:500]

                except json.JSONDecodeError:
                    # Skip malformed lines, continue to next
                    continue

    except (FileNotFoundError, PermissionError) as e:
        log(f"Failed to read transcript for first_prompt extraction: {e}", 'ERROR')
        raise  # Fast fail per user preference

    log(f"No user message found in transcript: {transcript_path}", 'WARN')
    return None


def get_github_repo(path: str) -> str | None:
    try:
        result = subprocess.run(
            ['git', '-C', path, 'remote', 'get-url', 'origin'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0 and 'github.com' in result.stdout:
            url = result.stdout.strip()
            if url.startswith('git@'):
                repo = url.split(':')[1].replace('.git', '')
                return repo
            elif 'github.com' in url:
                parts = url.rstrip('/').replace('.git', '').split('/')
                if len(parts) >= 2:
                    return '/'.join(parts[-2:])
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
        pass
    return None


def get_git_branch(path: str) -> str | None:
    try:
        result = subprocess.run(
            ['git', '-C', path, 'branch', '--show-current'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            return result.stdout.strip() or None
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
        pass
    return None


def extract_plan_from_transcript(transcript_path: str) -> dict | None:
    if not transcript_path or not os.path.exists(transcript_path):
        return None

    try:
        with open(transcript_path, 'r') as f:
            for line in f:
                try:
                    entry = json.loads(line)
                    if entry.get('tool_name') == 'Write':
                        file_path = entry.get('tool_input', {}).get('file_path', '')
                        if '/.claude/plans/' in file_path and file_path.endswith('.md'):
                            return {
                                'name': os.path.basename(file_path).replace('.md', ''),
                                'path': file_path,
                            }
                except json.JSONDecodeError:
                    continue
    except (FileNotFoundError, PermissionError, Exception):
        pass

    return None


def send_event(event: dict) -> None:
    try:
        data = json.dumps(event).encode('utf-8')
        req = urllib.request.Request(
            f"{OBEYA_SERVER}/events",
            data=data,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        response = urllib.request.urlopen(req, timeout=5)
        log(f"Server response: {response.status}")
    except Exception as e:
        log(f"Failed to send event: {e}", 'ERROR')


if __name__ == '__main__':
    main()
