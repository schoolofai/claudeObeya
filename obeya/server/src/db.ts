import Database from 'better-sqlite3';
import type { Project, Session, Plan, Task, Event, ProjectWithStats, DashboardOverview } from './types';

const DB_PATH = './obeya.db';

let db: Database.Database;

export function initDatabase(): Database.Database {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  runMigrations();
  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

function runMigrations(): void {
  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      github_repo TEXT,
      project_path TEXT NOT NULL UNIQUE,
      encoded_path TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      session_uuid TEXT NOT NULL UNIQUE,
      summary TEXT,
      first_prompt TEXT,
      status TEXT DEFAULT 'active',
      git_branch TEXT,
      model_name TEXT,
      message_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id),
      plan_name TEXT NOT NULL,
      plan_path TEXT NOT NULL,
      status TEXT DEFAULT 'in_progress',
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id),
      plan_id INTEGER REFERENCES plans(id),
      task_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT,
      active_form TEXT,
      status TEXT DEFAULT 'pending',
      blocked_by TEXT,
      blocks TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(session_id, task_id)
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER REFERENCES sessions(id),
      project_id INTEGER REFERENCES projects(id),
      hook_event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);
    CREATE INDEX IF NOT EXISTS idx_plans_session_id ON plans(session_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_session_id ON tasks(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
  `);

  // Run column migrations for existing databases
  runColumnMigrations();
}

function runColumnMigrations(): void {
  // Check if first_prompt column exists in sessions table
  const columns = db.prepare("PRAGMA table_info(sessions)").all() as Array<{ name: string }>;
  const hasFirstPrompt = columns.some(col => col.name === 'first_prompt');

  if (!hasFirstPrompt) {
    console.log('[DB] Adding first_prompt column to sessions table...');
    db.exec('ALTER TABLE sessions ADD COLUMN first_prompt TEXT');
    console.log('[DB] Migration complete: first_prompt column added');
  }

  // Check if plan_content column exists in plans table
  const planColumns = db.prepare("PRAGMA table_info(plans)").all() as Array<{ name: string }>;
  const hasPlanContent = planColumns.some(col => col.name === 'plan_content');

  if (!hasPlanContent) {
    console.log('[DB] Adding plan_content column to plans table...');
    db.exec('ALTER TABLE plans ADD COLUMN plan_content TEXT');
    console.log('[DB] Migration complete: plan_content column added');
  }
}

export function upsertProject(projectPath: string, githubRepo: string | null): Project {
  const now = Date.now();
  const encodedPath = projectPath.replace(/\//g, '-').replace(/^-/, '');
  const name = projectPath.split('/').pop() || projectPath;

  const existing = db.prepare('SELECT * FROM projects WHERE project_path = ?').get(projectPath) as Project | undefined;

  if (existing) {
    db.prepare('UPDATE projects SET github_repo = COALESCE(?, github_repo), updated_at = ? WHERE id = ?')
      .run(githubRepo, now, existing.id);
    return { ...existing, github_repo: githubRepo ?? existing.github_repo, updated_at: now };
  }

  const result = db.prepare(
    'INSERT INTO projects (github_repo, project_path, encoded_path, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(githubRepo, projectPath, encodedPath, name, now, now);

  return {
    id: Number(result.lastInsertRowid),
    github_repo: githubRepo,
    project_path: projectPath,
    encoded_path: encodedPath,
    name,
    created_at: now,
    updated_at: now,
  };
}

export function upsertSession(
  projectId: number,
  sessionUuid: string,
  summary?: string,
  firstPrompt?: string,
  gitBranch?: string,
  modelName?: string
): Session {
  const now = Date.now();

  const existing = db.prepare('SELECT * FROM sessions WHERE session_uuid = ?').get(sessionUuid) as Session | undefined;

  if (existing) {
    db.prepare(`UPDATE sessions SET
        summary = COALESCE(?, summary),
        first_prompt = COALESCE(?, first_prompt),
        git_branch = COALESCE(?, git_branch),
        model_name = COALESCE(?, model_name),
        status = 'active',
        updated_at = ?
      WHERE id = ?`).run(summary, firstPrompt, gitBranch, modelName, now, existing.id);
    return {
      ...existing,
      summary: summary ?? existing.summary,
      first_prompt: firstPrompt ?? existing.first_prompt,
      git_branch: gitBranch ?? existing.git_branch,
      model_name: modelName ?? existing.model_name,
      status: 'active',
      updated_at: now,
    };
  }

  const result = db.prepare(
    `INSERT INTO sessions (project_id, session_uuid, summary, first_prompt, status, git_branch, model_name, message_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'active', ?, ?, 0, ?, ?)`
  ).run(projectId, sessionUuid, summary ?? null, firstPrompt ?? null, gitBranch ?? null, modelName ?? null, now, now);

  return {
    id: Number(result.lastInsertRowid),
    project_id: projectId,
    session_uuid: sessionUuid,
    summary: summary ?? null,
    first_prompt: firstPrompt ?? null,
    status: 'active',
    git_branch: gitBranch ?? null,
    model_name: modelName ?? null,
    message_count: 0,
    created_at: now,
    updated_at: now,
  };
}

export function endSession(sessionUuid: string): void {
  db.prepare("UPDATE sessions SET status = 'ended', updated_at = ? WHERE session_uuid = ?")
    .run(Date.now(), sessionUuid);
}

export function upsertPlan(
  sessionId: number,
  planName: string,
  planPath: string,
  status: 'in_progress' | 'completed' = 'in_progress'
): Plan {
  const now = Date.now();

  const existing = db.prepare('SELECT * FROM plans WHERE session_id = ? AND plan_name = ?')
    .get(sessionId, planName) as Plan | undefined;

  if (existing) {
    const completedAt = status === 'completed' ? now : existing.completed_at;
    db.prepare('UPDATE plans SET status = ?, completed_at = ? WHERE id = ?')
      .run(status, completedAt, existing.id);
    return { ...existing, status, completed_at: completedAt };
  }

  // When creating a new plan record, check if another session has the same plan with content
  // This handles the case where a session resumes work on an existing plan (plan_associated)
  const existingWithContent = db.prepare(
    'SELECT plan_content FROM plans WHERE plan_name = ? AND plan_content IS NOT NULL LIMIT 1'
  ).get(planName) as { plan_content: string } | undefined;

  const planContent = existingWithContent?.plan_content ?? null;

  const result = db.prepare(
    'INSERT INTO plans (session_id, plan_name, plan_path, plan_content, status, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(sessionId, planName, planPath, planContent, status, now, status === 'completed' ? now : null);

  return {
    id: Number(result.lastInsertRowid),
    session_id: sessionId,
    plan_name: planName,
    plan_path: planPath,
    plan_content: planContent,
    status,
    created_at: now,
    completed_at: status === 'completed' ? now : null,
  };
}

export function upsertTask(
  sessionId: number,
  taskId: string,
  subject: string,
  description?: string,
  activeForm?: string,
  status: 'pending' | 'in_progress' | 'completed' = 'pending',
  blockedBy?: string[],
  blocks?: string[],
  planId?: number
): Task {
  const now = Date.now();
  const blockedByJson = blockedBy ? JSON.stringify(blockedBy) : null;
  const blocksJson = blocks ? JSON.stringify(blocks) : null;

  const existing = db.prepare('SELECT * FROM tasks WHERE session_id = ? AND task_id = ?')
    .get(sessionId, taskId) as Task | undefined;

  if (existing) {
    // Use NULLIF to convert empty strings to NULL so COALESCE preserves existing values
    const subjectForUpdate = subject && subject.trim() ? subject : null;
    const descriptionForUpdate = description && description.trim() ? description : null;
    const activeFormForUpdate = activeForm && activeForm.trim() ? activeForm : null;

    db.prepare(`UPDATE tasks SET
        subject = COALESCE(?, subject),
        description = COALESCE(?, description),
        active_form = COALESCE(?, active_form),
        status = ?,
        blocked_by = COALESCE(?, blocked_by),
        blocks = COALESCE(?, blocks),
        plan_id = COALESCE(?, plan_id),
        updated_at = ?
      WHERE id = ?`).run(subjectForUpdate, descriptionForUpdate, activeFormForUpdate, status, blockedByJson, blocksJson, planId, now, existing.id);
    return {
      ...existing,
      subject: subjectForUpdate ?? existing.subject,
      description: descriptionForUpdate ?? existing.description,
      active_form: activeFormForUpdate ?? existing.active_form,
      status,
      blocked_by: blockedByJson ?? existing.blocked_by,
      blocks: blocksJson ?? existing.blocks,
      plan_id: planId ?? existing.plan_id,
      updated_at: now,
    };
  }

  const result = db.prepare(
    `INSERT INTO tasks (session_id, plan_id, task_id, subject, description, active_form, status, blocked_by, blocks, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(sessionId, planId ?? null, taskId, subject, description ?? null, activeForm ?? null, status, blockedByJson, blocksJson, now, now);

  return {
    id: Number(result.lastInsertRowid),
    session_id: sessionId,
    plan_id: planId ?? null,
    task_id: taskId,
    subject,
    description: description ?? null,
    active_form: activeForm ?? null,
    status,
    blocked_by: blockedByJson,
    blocks: blocksJson,
    created_at: now,
    updated_at: now,
  };
}

export function insertEvent(
  hookEventType: string,
  payload: string,
  sessionId?: number,
  projectId?: number
): Event {
  const now = Date.now();
  const result = db.prepare(
    'INSERT INTO events (session_id, project_id, hook_event_type, payload, timestamp) VALUES (?, ?, ?, ?, ?)'
  ).run(sessionId ?? null, projectId ?? null, hookEventType, payload, now);

  return {
    id: Number(result.lastInsertRowid),
    session_id: sessionId ?? null,
    project_id: projectId ?? null,
    hook_event_type: hookEventType,
    payload,
    timestamp: now,
  };
}

export function getAllProjects(): Project[] {
  return db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all() as Project[];
}

export function getProjectsWithStats(): ProjectWithStats[] {
  return db.prepare(`
    SELECT
      p.*,
      (SELECT COUNT(*) FROM sessions WHERE project_id = p.id) as session_count,
      (SELECT COUNT(*) FROM plans pl JOIN sessions s ON pl.session_id = s.id WHERE s.project_id = p.id) as plan_count,
      (SELECT COUNT(*) FROM tasks t JOIN sessions s ON t.session_id = s.id WHERE s.project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks t JOIN sessions s ON t.session_id = s.id WHERE s.project_id = p.id AND t.status = 'completed') as completed_task_count
    FROM projects p
    ORDER BY p.updated_at DESC
  `).all() as ProjectWithStats[];
}

export function getProjectById(id: number): Project | null {
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | null;
}

export function getProjectByIdWithStats(id: number): ProjectWithStats | null {
  return db.prepare(`
    SELECT
      p.*,
      (SELECT COUNT(*) FROM sessions WHERE project_id = p.id) as session_count,
      (SELECT COUNT(*) FROM plans pl JOIN sessions s ON pl.session_id = s.id WHERE s.project_id = p.id) as plan_count,
      (SELECT COUNT(*) FROM tasks t JOIN sessions s ON t.session_id = s.id WHERE s.project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks t JOIN sessions s ON t.session_id = s.id WHERE s.project_id = p.id AND t.status = 'completed') as completed_task_count
    FROM projects p
    WHERE p.id = ?
  `).get(id) as ProjectWithStats | null;
}

export function getSessionsByProjectId(projectId: number): Session[] {
  return db.prepare('SELECT * FROM sessions WHERE project_id = ? ORDER BY created_at DESC').all(projectId) as Session[];
}

export function getSessionByUuid(sessionUuid: string): Session | null {
  return db.prepare('SELECT * FROM sessions WHERE session_uuid = ?').get(sessionUuid) as Session | null;
}

export function getPlansBySessionId(sessionId: number): Plan[] {
  return db.prepare('SELECT * FROM plans WHERE session_id = ? ORDER BY created_at DESC').all(sessionId) as Plan[];
}

export function getTasksBySessionId(sessionId: number): Task[] {
  return db.prepare('SELECT * FROM tasks WHERE session_id = ? ORDER BY task_id ASC').all(sessionId) as Task[];
}

export function getDashboardOverview(): DashboardOverview {
  const projects = getProjectsWithStats();

  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM sessions WHERE status = 'active') as active_sessions,
      (SELECT COUNT(*) FROM plans WHERE status = 'in_progress') as in_progress_plans,
      (SELECT COUNT(*) FROM tasks) as total_tasks,
      (SELECT COUNT(*) FROM tasks WHERE status = 'completed') as completed_tasks
  `).get() as {
    active_sessions: number;
    in_progress_plans: number;
    total_tasks: number;
    completed_tasks: number;
  };

  return {
    total_projects: projects.length,
    active_sessions: stats.active_sessions,
    in_progress_plans: stats.in_progress_plans,
    total_tasks: stats.total_tasks,
    completed_tasks: stats.completed_tasks,
    projects,
  };
}

export function getRecentSessionsForProject(projectId: number, limit: number = 3): Session[] {
  return db.prepare('SELECT * FROM sessions WHERE project_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(projectId, limit) as Session[];
}

export function getPlanById(planId: number): Plan | null {
  return db.prepare('SELECT * FROM plans WHERE id = ?').get(planId) as Plan | null;
}

export function getPlanBySessionAndName(sessionId: number, planName: string): Plan | null {
  return db.prepare('SELECT * FROM plans WHERE session_id = ? AND plan_name = ?')
    .get(sessionId, planName) as Plan | null;
}

export function updatePlanContent(planId: number, content: string): Plan {
  const existing = getPlanById(planId);
  if (!existing) {
    throw new Error(`Plan with id ${planId} not found`);
  }

  db.prepare('UPDATE plans SET plan_content = ? WHERE id = ?').run(content, planId);

  return { ...existing, plan_content: content };
}

export function getPlansWithNullContent(): Plan[] {
  return db.prepare('SELECT * FROM plans WHERE plan_content IS NULL').all() as Plan[];
}

export function getAllPlans(): Plan[] {
  return db.prepare('SELECT * FROM plans ORDER BY created_at DESC').all() as Plan[];
}
