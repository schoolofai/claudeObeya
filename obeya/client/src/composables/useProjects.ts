import { ref, onMounted, onUnmounted } from 'vue';

function log(level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR', message: string, data?: unknown): void {
  const timestamp = new Date().toISOString().slice(11, 23);
  const prefix = `[${timestamp}] [Obeya:API:${level}]`;
  const style = {
    INFO: 'color: #3b82f6',
    DEBUG: 'color: #6b7280',
    WARN: 'color: #f59e0b',
    ERROR: 'color: #ef4444',
  }[level];

  if (data !== undefined) {
    console.log(`%c${prefix} ${message}`, style, data);
  } else {
    console.log(`%c${prefix} ${message}`, style);
  }
}

export interface ProjectWithStats {
  id: number;
  github_repo: string | null;
  project_path: string;
  encoded_path: string;
  name: string;
  created_at: number;
  updated_at: number;
  session_count: number;
  plan_count: number;
  task_count: number;
  completed_task_count: number;
}

export interface DashboardOverview {
  total_projects: number;
  active_sessions: number;
  in_progress_plans: number;
  total_tasks: number;
  completed_tasks: number;
  projects: ProjectWithStats[];
}

export function useProjects() {
  const overview = ref<DashboardOverview | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);

  async function fetchOverview() {
    loading.value = true;
    error.value = null;
    log('INFO', '📊 Fetching dashboard overview...');

    try {
      const response = await fetch('/api/dashboard/overview');
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      overview.value = await response.json();
      log('INFO', `✅ Dashboard loaded: ${overview.value?.total_projects} projects, ${overview.value?.total_tasks} tasks`);
      log('DEBUG', 'Dashboard data:', overview.value);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch data';
      log('ERROR', '❌ Failed to fetch dashboard:', error.value);
    } finally {
      loading.value = false;
    }
  }

  function handleObeyaEvent() {
    log('INFO', '🔄 Received obeya-event, refreshing dashboard...');
    fetchOverview();
  }

  onMounted(() => {
    fetchOverview();
    window.addEventListener('obeya-event', handleObeyaEvent);
  });

  onUnmounted(() => {
    window.removeEventListener('obeya-event', handleObeyaEvent);
  });

  return {
    overview,
    loading,
    error,
    refresh: fetchOverview,
  };
}

export interface Session {
  id: number;
  project_id: number;
  session_uuid: string;
  summary: string | null;
  first_prompt: string | null;
  status: 'active' | 'ended';
  git_branch: string | null;
  model_name: string | null;
  message_count: number;
  created_at: number;
  updated_at: number;
}

export interface Plan {
  id: number;
  session_id: number;
  plan_name: string;
  plan_path: string;
  plan_content: string | null;
  status: 'in_progress' | 'completed';
  created_at: number;
  completed_at: number | null;
}

export interface Task {
  id: number;
  session_id: number;
  plan_id: number | null;
  task_id: string;
  subject: string;
  description: string | null;
  active_form: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  blocked_by: string | null;
  blocks: string | null;
  created_at: number;
  updated_at: number;
}

export function useProjectSessions(projectId: number) {
  const sessions = ref<Session[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);

  async function fetchSessions() {
    loading.value = true;
    error.value = null;
    log('INFO', `📋 Fetching sessions for project ${projectId}...`);

    try {
      const response = await fetch(`/api/projects/${projectId}/sessions`);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      const data = await response.json();
      sessions.value = data.sessions;
      log('INFO', `✅ Sessions loaded: ${sessions.value.length} sessions`);
      log('DEBUG', 'Sessions data:', sessions.value);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch sessions';
      log('ERROR', '❌ Failed to fetch sessions:', error.value);
    } finally {
      loading.value = false;
    }
  }

  function handleObeyaEvent(event: Event) {
    const customEvent = event as CustomEvent;
    const data = customEvent.detail;

    // Handle targeted session title updates without full refresh
    if (data?.type === 'session_title_updated') {
      const session = sessions.value.find(s => s.session_uuid === data.sessionUuid);
      if (session) {
        if (data.summary) {
          session.summary = data.summary;
          log('INFO', `🏷️ Session title updated (summary): "${data.summary.slice(0, 40)}..."`);
        }
        if (data.firstPrompt) {
          session.first_prompt = data.firstPrompt;
          log('INFO', `🏷️ Session title updated (first_prompt): "${data.firstPrompt.slice(0, 40)}..."`);
        }
        return;
      }
    }

    // Full refresh for other events
    log('INFO', '🔄 Received obeya-event, refreshing sessions...');
    fetchSessions();
  }

  onMounted(() => {
    fetchSessions();
    window.addEventListener('obeya-event', handleObeyaEvent);
  });

  onUnmounted(() => {
    window.removeEventListener('obeya-event', handleObeyaEvent);
  });

  return {
    sessions,
    loading,
    error,
    refresh: fetchSessions,
  };
}

export function useSessionDetails(sessionUuid: string) {
  const session = ref<Session | null>(null);
  const plans = ref<Plan[]>([]);
  const tasks = ref<Task[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);

  async function fetchDetails() {
    loading.value = true;
    error.value = null;
    log('INFO', `📝 Fetching session details for ${sessionUuid.slice(0, 8)}...`);

    try {
      const response = await fetch(`/api/sessions/${sessionUuid}?details=true`);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      const data = await response.json();
      session.value = data.session;
      plans.value = data.session.plans || [];
      tasks.value = data.session.tasks || [];
      log('INFO', `✅ Session details loaded: ${plans.value.length} plans, ${tasks.value.length} tasks`);
      log('DEBUG', 'Session data:', data.session);
      log('DEBUG', 'Plans:', plans.value);
      log('DEBUG', 'Tasks:', tasks.value);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch session details';
      log('ERROR', '❌ Failed to fetch session details:', error.value);
    } finally {
      loading.value = false;
    }
  }

  function handleObeyaEvent(event: Event) {
    const customEvent = event as CustomEvent;
    const data = customEvent.detail;

    // Handle targeted session title updates for this specific session
    if (data?.type === 'session_title_updated' && data.sessionUuid === sessionUuid) {
      if (session.value) {
        if (data.summary) {
          session.value.summary = data.summary;
          log('INFO', `🏷️ Session detail title updated (summary): "${data.summary.slice(0, 40)}..."`);
        }
        if (data.firstPrompt) {
          session.value.first_prompt = data.firstPrompt;
          log('INFO', `🏷️ Session detail title updated (first_prompt): "${data.firstPrompt.slice(0, 40)}..."`);
        }
        return;
      }
    }

    // Full refresh for other events
    log('INFO', '🔄 Received obeya-event, refreshing session details...');
    fetchDetails();
  }

  onMounted(() => {
    fetchDetails();
    window.addEventListener('obeya-event', handleObeyaEvent);
  });

  onUnmounted(() => {
    window.removeEventListener('obeya-event', handleObeyaEvent);
  });

  return {
    session,
    plans,
    tasks,
    loading,
    error,
    refresh: fetchDetails,
  };
}
