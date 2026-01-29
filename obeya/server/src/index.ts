import { createServer, IncomingMessage, ServerResponse } from 'http';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { initDatabase, upsertProject, upsertSession, endSession, upsertPlan, upsertTask, insertEvent, getPlanBySessionAndName, updatePlanContent } from './db';
import { handleProjectsRoutes } from './api/projects';
import { handleSessionsRoutes } from './api/sessions';
import { handlePlansRoutes } from './api/plans';
import { handleTasksRoutes } from './api/tasks';
import { handleDashboardRoutes } from './api/dashboard';
import { initWebSocket, broadcastEvent, getConnectedClientCount } from './websocket';
import type { HookEvent } from './types';

const PORT = parseInt(process.env.OBEYA_PORT || '4001', 10);
const DEBUG = process.env.OBEYA_DEBUG === '1';
const LOG_FILE = process.env.OBEYA_LOG_FILE || '/tmp/obeya_server.log';

// Ensure log directory exists
const logDir = dirname(LOG_FILE);
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

function log(level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR', message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;
  let logLine: string;

  if (data !== undefined) {
    const dataStr = JSON.stringify(data, null, 2);
    logLine = `${prefix} ${message} ${dataStr}`;
    console.log(`${prefix} ${message}`, dataStr);
  } else {
    logLine = `${prefix} ${message}`;
    console.log(logLine);
  }

  // Write to log file
  try {
    appendFileSync(LOG_FILE, logLine + '\n');
  } catch {
    // Ignore file write errors
  }
}

function debug(message: string, data?: unknown): void {
  if (DEBUG) {
    log('DEBUG', message, data);
  }
}

log('INFO', '🚀 Starting Obeya Server...');
log('INFO', `📊 Debug mode: ${DEBUG ? 'ENABLED' : 'DISABLED'}`);
log('INFO', '💾 Initializing database...');
initDatabase();
log('INFO', '✅ Database initialized');

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function sendJson(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, CORS_HEADERS);
  res.end(JSON.stringify(data));
}

function parseBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const urlString = `http://localhost${req.url || '/'}`;
  const url = new URL(urlString);
  const method = req.method || 'GET';

  if (method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  const mockRequest = {
    method,
    url: urlString,
  } as Request;

  let response: Response | null = null;

  response = handleProjectsRoutes(mockRequest, url);
  if (response) {
    sendJson(res, await response.json(), response.status);
    return;
  }

  response = handleSessionsRoutes(mockRequest, url);
  if (response) {
    sendJson(res, await response.json(), response.status);
    return;
  }

  response = handlePlansRoutes(mockRequest, url);
  if (response) {
    sendJson(res, await response.json(), response.status);
    return;
  }

  response = handleTasksRoutes(mockRequest, url);
  if (response) {
    sendJson(res, await response.json(), response.status);
    return;
  }

  response = handleDashboardRoutes(mockRequest, url);
  if (response) {
    sendJson(res, await response.json(), response.status);
    return;
  }

  if (url.pathname === '/events' && method === 'POST') {
    try {
      const body = await parseBody(req);
      log('INFO', '═══════════════════════════════════════════════════════════════');
      log('INFO', '📥 EVENT RECEIVED');
      debug('Raw body length:', body.length);

      const event = JSON.parse(body) as HookEvent;

      if (!event.payload?.project_path) {
        log('ERROR', '❌ Missing project_path in payload');
        sendJson(res, { error: 'Missing project_path in payload' }, 400);
        return;
      }

      log('INFO', `📌 Hook: ${event.hook_event_type} | Session: ${event.session_id?.slice(0, 8) || 'N/A'}...`);
      log('INFO', `📁 Project: ${event.payload.project_path}`);
      if (event.payload.github_repo) {
        log('INFO', `🔗 GitHub: ${event.payload.github_repo}`);
      }

      const project = upsertProject(event.payload.project_path, event.payload.github_repo);
      log('INFO', `✅ Project upserted: id=${project.id}`);

      let sessionDbId: number | undefined;

      if (event.session_id) {
        const sessionEvent = event.payload.session_event;
        const summaryUpdate = event.payload.session_summary_update;
        debug('Session event:', sessionEvent);
        debug('Summary update:', summaryUpdate);

        // Use summary from session_event (SessionStart) or session_summary_update (any event)
        const summary = sessionEvent?.summary || summaryUpdate?.summary;
        const firstPrompt = sessionEvent?.first_prompt || summaryUpdate?.first_prompt;

        const session = upsertSession(
          project.id,
          event.session_id,
          summary,
          firstPrompt,
          sessionEvent?.git_branch,
          sessionEvent?.model_name
        );
        sessionDbId = session.id;

        if (summaryUpdate?.summary && !sessionEvent?.summary) {
          log('INFO', `📝 Session summary updated from later event: "${summaryUpdate.summary.slice(0, 50)}..."`);
        }
        if (summaryUpdate?.first_prompt && !sessionEvent?.first_prompt) {
          log('INFO', `📝 Session first_prompt updated from later event: "${summaryUpdate.first_prompt.slice(0, 50)}..."`);
        }
        log('INFO', `✅ Session upserted: id=${session.id}, uuid=${event.session_id.slice(0, 8)}..., summary=${summary ? 'yes' : 'no'}, first_prompt=${firstPrompt ? 'yes' : 'no'}`);

        // Broadcast session title update when summary or first_prompt is provided from a later event
        // This enables real-time title updates without full page refresh
        if (summaryUpdate && (summaryUpdate.summary || summaryUpdate.first_prompt)) {
          broadcastEvent({
            type: 'session_title_updated',
            sessionUuid: event.session_id,
            summary: summaryUpdate.summary || null,
            firstPrompt: summaryUpdate.first_prompt || null,
            timestamp: event.timestamp,
          });
          const titlePreview = (summaryUpdate.summary || summaryUpdate.first_prompt || '').slice(0, 40);
          log('INFO', `📢 Broadcasting session title update: "${titlePreview}..."`);
        }

        if (event.hook_event_type === 'SessionEnd') {
          endSession(event.session_id);
          log('INFO', '📤 Session ended');
        }
      }

      // Process plan events
      if (event.payload.plan_event && sessionDbId) {
        const planEvent = event.payload.plan_event;
        log('INFO', `📋 PLAN EVENT: type=${planEvent.type}`);
        debug('Plan event details:', planEvent);

        if (planEvent.plan_name && planEvent.plan_path) {
          // Skip creating associations for plan_file_read - reading a plan file
          // shouldn't associate it with the session (prevents cross-session contamination)
          if (planEvent.type === 'plan_file_read') {
            log('INFO', `📖 Plan file read (no association): ${planEvent.plan_name}`);
          } else {
            // Determine status based on event type
            let status: 'in_progress' | 'completed' = 'in_progress';
            if (planEvent.type === 'plan_completed') {
              status = 'completed';
            }

            if (planEvent.type === 'plan_associated') {
              log('INFO', `📋 Linking plan to session via ${planEvent.type}: ${planEvent.plan_name}`);
            }

            upsertPlan(sessionDbId, planEvent.plan_name, planEvent.plan_path, status);
            log('INFO', `✅ Plan upserted: name=${planEvent.plan_name}, status=${status}, session=${sessionDbId}`);
          }
        } else if (planEvent.plan_name) {
          // Handle case where we have plan_name but no path (derive path from slug)
          const planPath = `/Users/${process.env.USER || 'user'}/.claude/plans/${planEvent.plan_name}.md`;
          log('INFO', `📋 Linking plan (derived path): ${planEvent.plan_name}`);
          upsertPlan(sessionDbId, planEvent.plan_name, planPath, 'in_progress');
          log('INFO', `✅ Plan upserted: name=${planEvent.plan_name}, session=${sessionDbId}`);
        } else {
          log('WARN', '⚠️ Plan event missing name or path', { planEvent });
        }

        // Handle plan content update
        if (planEvent.type === 'plan_content_updated' && planEvent.plan_content && planEvent.plan_name) {
          const plan = getPlanBySessionAndName(sessionDbId, planEvent.plan_name);
          if (plan) {
            updatePlanContent(plan.id, planEvent.plan_content);
            log('INFO', `✅ Plan content updated: planId=${plan.id}, name=${planEvent.plan_name}`);

            // Broadcast plan content update to WebSocket clients
            broadcastEvent({
              type: 'plan_content_updated',
              planId: plan.id,
              planName: planEvent.plan_name,
              sessionId: event.session_id,
              content: planEvent.plan_content,
              timestamp: event.timestamp,
            });
            log('INFO', `📡 Broadcast plan_content_updated for plan ${plan.id}`);
          } else {
            log('WARN', `⚠️ Could not find plan to update content: session=${sessionDbId}, name=${planEvent.plan_name}`);
          }
        }
      }

      // Process task events
      if (event.payload.task_event && sessionDbId) {
        const taskEvent = event.payload.task_event;
        log('INFO', `📝 TASK EVENT: type=${taskEvent.type}, hook=${event.hook_event_type}`);
        debug('Task event full details:', taskEvent);

        const taskData = taskEvent.task as Record<string, unknown> | undefined;
        debug('Task data:', taskData);

        // Extract task_id - try multiple sources
        let taskId = (taskEvent.task_id || taskData?.taskId) as string | undefined;

        // For PostToolUse, also check result.task.id (Claude Code format)
        if (!taskId && taskEvent.result && typeof taskEvent.result === 'object') {
          const resultTask = (taskEvent.result as Record<string, unknown>).task as Record<string, unknown> | undefined;
          if (resultTask?.id) {
            taskId = String(resultTask.id);
            log('INFO', `📝 Extracted task_id from result.task.id: ${taskId}`);
          }
        }

        if (taskId) {
          let subject = (taskData?.subject as string) || '';
          const description = taskData?.description as string | undefined;
          const activeForm = taskData?.activeForm as string | undefined;
          let status = (taskData?.status as 'pending' | 'in_progress' | 'completed') || 'pending';
          const blockedBy = taskData?.blockedBy as string[] | undefined;
          const blocks = taskData?.blocks as string[] | undefined;

          // Try to extract from result.task if subject is empty
          if (!subject && taskEvent.result && typeof taskEvent.result === 'object') {
            const resultTask = (taskEvent.result as Record<string, unknown>).task as Record<string, unknown> | undefined;
            if (resultTask?.subject) {
              subject = String(resultTask.subject);
              log('INFO', `📝 Extracted subject from result.task.subject: "${subject}"`);
            }
            if (resultTask?.status) {
              status = resultTask.status as 'pending' | 'in_progress' | 'completed';
              log('INFO', `📝 Extracted status from result.task.status: "${status}"`);
            }
          }

          // Determine if this is a create or update operation
          const isCreate = taskEvent.type === 'task_create';

          // Only use fallback subject for task creation, not updates
          if (!subject && isCreate) {
            subject = 'Unknown task';
            log('WARN', `⚠️ Task ${taskId} has no subject, using fallback`);
          }

          // For updates without subject, pass undefined to preserve existing value
          const subjectForDb = subject || (isCreate ? 'Unknown task' : undefined);

          log('INFO', `📝 Task details: id=${taskId}, subject="${subjectForDb?.slice(0, 50) || '(preserved)'}...", status=${status}, operation=${isCreate ? 'create' : 'update'}`);
          upsertTask(sessionDbId, taskId, subjectForDb || '', description, activeForm, status, blockedBy, blocks);
          log('INFO', `✅ Task upserted: id=${taskId}`);
        } else {
          // PreToolUse won't have task_id yet - this is expected
          if (event.hook_event_type === 'PreToolUse') {
            log('DEBUG', '📝 PreToolUse task event (no task_id yet, will capture on PostToolUse)');
          } else {
            log('WARN', '⚠️ PostToolUse task event missing task_id', { taskEvent });
          }
        }
      }

      insertEvent(event.hook_event_type, JSON.stringify(event.payload), sessionDbId, project.id);
      log('INFO', '✅ Event stored in database');

      const broadcastPayload = {
        type: 'event_received',
        hookEventType: event.hook_event_type,
        sessionId: event.session_id,
        projectId: project.id,
        timestamp: event.timestamp,
      };
      broadcastEvent(broadcastPayload);
      log('INFO', `📡 Broadcast to ${getConnectedClientCount()} WebSocket clients`);
      log('INFO', '═══════════════════════════════════════════════════════════════');

      sendJson(res, { success: true, projectId: project.id, sessionId: sessionDbId });
    } catch (error) {
      log('ERROR', '❌ Error processing event:', error);
      sendJson(res, { error: 'Invalid JSON payload' }, 400);
    }
    return;
  }

  if (url.pathname === '/health' && method === 'GET') {
    sendJson(res, {
      status: 'ok',
      connectedClients: getConnectedClientCount(),
      timestamp: Date.now(),
    });
    return;
  }

  sendJson(res, { error: 'Not found' }, 404);
});

initWebSocket(server);

server.listen(PORT, () => {
  log('INFO', `🌐 Server running on http://localhost:${PORT}`);
  log('INFO', `📡 WebSocket available at ws://localhost:${PORT}/stream`);
  log('INFO', `📝 Logs written to: ${LOG_FILE}`);
  log('INFO', `💡 Set OBEYA_DEBUG=1 for verbose logging`);
  log('INFO', `💡 Set OBEYA_LOG_FILE to change log location`);
});
