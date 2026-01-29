export interface Project {
  id: number;
  github_repo: string | null;
  project_path: string;
  encoded_path: string;
  name: string;
  created_at: number;
  updated_at: number;
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

export interface Event {
  id: number;
  session_id: number | null;
  project_id: number | null;
  hook_event_type: string;
  payload: string;
  timestamp: number;
}

export interface HookEvent {
  source_app: string;
  session_id: string;
  hook_event_type: string;
  timestamp: number;
  payload: {
    project_path: string;
    github_repo: string | null;
    plan_event?: {
      type: 'plan_started' | 'plan_completed' | 'plan_file_created' | 'plan_file_read' | 'plan_associated' | 'plan_content_updated';
      session_id?: string;
      plan_name?: string;
      plan_path?: string;
      plan_content?: string;
    };
    task_event?: {
      type: 'task_create' | 'task_update' | 'task_list' | 'task_get';
      task_id?: string;
      task?: Record<string, unknown>;
      result?: Record<string, unknown>;
    };
    session_event?: {
      type: 'session_start' | 'session_end';
      source?: 'startup' | 'resume' | 'clear';
      summary?: string;
      first_prompt?: string;
      git_branch?: string;
      model_name?: string;
    };
    session_summary_update?: {
      summary?: string;
      first_prompt?: string;
    };
  };
}

export interface ProjectWithStats extends Project {
  session_count: number;
  plan_count: number;
  task_count: number;
  completed_task_count: number;
}

export interface SessionWithDetails extends Session {
  plans: Plan[];
  tasks: Task[];
}

export interface DashboardOverview {
  total_projects: number;
  active_sessions: number;
  in_progress_plans: number;
  total_tasks: number;
  completed_tasks: number;
  projects: ProjectWithStats[];
}
