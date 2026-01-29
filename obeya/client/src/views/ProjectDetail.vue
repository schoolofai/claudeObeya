<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import type { Session } from '../composables/useProjects';
import { TuiSpinner, TuiWindow } from '../components/tui';
import HorizontalTimeline from '../components/HorizontalTimeline.vue';
import TaskProgressBar from '../components/TaskProgressBar.vue';

interface ProjectWithStats {
  id: number;
  github_repo: string | null;
  project_path: string;
  name: string;
  session_count: number;
  plan_count: number;
  task_count: number;
  completed_task_count: number;
}

const route = useRoute();
const project = ref<ProjectWithStats | null>(null);
const sessions = ref<Session[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

async function fetchProject() {
  loading.value = true;
  error.value = null;

  try {
    const projectId = route.params.id;

    const [projectRes, sessionsRes] = await Promise.all([
      fetch(`/api/projects/${projectId}?stats=true`),
      fetch(`/api/projects/${projectId}/sessions`),
    ]);

    if (!projectRes.ok) {
      throw new Error('Project not found');
    }

    const projectData = await projectRes.json();
    project.value = projectData.project;

    if (sessionsRes.ok) {
      const sessionsData = await sessionsRes.json();
      sessions.value = sessionsData.sessions;
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load project';
  } finally {
    loading.value = false;
  }
}

function handleObeyaEvent() {
  fetchProject();
}

onMounted(() => {
  fetchProject();
  window.addEventListener('obeya-event', handleObeyaEvent);
});

onUnmounted(() => {
  window.removeEventListener('obeya-event', handleObeyaEvent);
});

watch(() => route.params.id, () => {
  fetchProject();
});
</script>

<template>
  <div class="project-detail">
    <router-link to="/" class="back-link">
      <span class="back-arrow">←</span>
      <span>cd ..</span>
    </router-link>

    <div v-if="loading && !project" class="loading-state">
      <TuiSpinner variant="braille" :speed="80" :glow="true">
        Loading project data...
      </TuiSpinner>
    </div>

    <div v-else-if="error" class="error-state">
      <span class="error-icon">[✗]</span>
      <span class="error-text">ERROR: {{ error }}</span>
    </div>

    <template v-else-if="project">
      <TuiWindow :title="project.name" variant="double" :show-controls="false" :glow="true">
        <div class="project-content">
          <div class="project-path">
            <span class="path-label">path:</span>
            <span class="path-value">{{ project.github_repo || project.project_path }}</span>
          </div>

          <div class="stats-grid">
            <div class="stat-box">
              <span class="stat-value">{{ project.session_count }}</span>
              <span class="stat-label">SESSIONS</span>
            </div>
            <div class="stat-box">
              <span class="stat-value">{{ project.plan_count }}</span>
              <span class="stat-label">PLANS</span>
            </div>
            <div class="stat-box">
              <span class="stat-value stat-value--highlight">{{ project.completed_task_count }}/{{ project.task_count }}</span>
              <span class="stat-label">TASKS</span>
            </div>
          </div>

          <div class="progress-section">
            <span class="progress-label">Overall Progress:</span>
            <TaskProgressBar
              :percent="project.task_count > 0 ? Math.round((project.completed_task_count / project.task_count) * 100) : 0"
            />
          </div>
        </div>
      </TuiWindow>

      <HorizontalTimeline :sessions="sessions" :project-id="project.id" />
    </template>
  </div>
</template>

<style scoped>
.project-detail {
  max-width: 1200px;
  margin: 0 auto;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: var(--tui-space-2);
  color: var(--tui-theme-primary);
  text-decoration: none;
  font-size: var(--tui-font-size-sm);
  margin-bottom: var(--tui-space-6);
  padding: var(--tui-space-1) 0;
}

.back-link:hover {
  text-decoration: underline;
}

.back-arrow {
  font-size: var(--tui-font-size-base);
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--tui-space-4);
  padding: var(--tui-space-16);
  color: var(--tui-text-muted);
}

.error-state {
  color: var(--tui-error);
}

.error-icon {
  font-size: var(--tui-font-size-xl);
  font-weight: var(--tui-font-weight-bold);
}

.error-text {
  font-size: var(--tui-font-size-base);
}

.project-content {
  display: flex;
  flex-direction: column;
  gap: var(--tui-space-4);
}

.project-path {
  display: flex;
  align-items: center;
  gap: var(--tui-space-2);
  font-size: var(--tui-font-size-sm);
  padding-bottom: var(--tui-space-3);
  border-bottom: 1px dashed var(--tui-border-muted);
}

.path-label {
  color: var(--tui-cyan-base);
}

.path-value {
  color: var(--tui-text-muted);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--tui-space-4);
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--tui-space-1);
  padding: var(--tui-space-4);
  background: var(--tui-bg-elevated);
  border: 1px solid var(--tui-border-muted);
}

.stat-value {
  font-size: var(--tui-font-size-2xl);
  font-weight: var(--tui-font-weight-bold);
  color: var(--tui-theme-primary);
  text-shadow:
    0 0 4px var(--tui-theme-primary-glow),
    0 0 8px var(--tui-theme-primary-glow);
}

.stat-value--highlight {
  color: var(--tui-success);
  text-shadow:
    0 0 4px var(--tui-green-glow),
    0 0 8px var(--tui-green-glow);
}

.stat-label {
  font-size: var(--tui-font-size-xs);
  color: var(--tui-text-secondary);
  letter-spacing: var(--tui-letter-spacing-wider);
}

.progress-section {
  display: flex;
  align-items: center;
  gap: var(--tui-space-4);
  padding-top: var(--tui-space-3);
  border-top: 1px dashed var(--tui-border-muted);
}

.progress-label {
  font-size: var(--tui-font-size-sm);
  font-weight: var(--tui-font-weight-medium);
  color: var(--tui-text-secondary);
  white-space: nowrap;
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
