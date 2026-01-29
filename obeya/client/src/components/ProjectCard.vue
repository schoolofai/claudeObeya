<script setup lang="ts">
import { computed } from 'vue';
import type { ProjectWithStats } from '../composables/useProjects';
import { TuiBox } from './tui';
import TaskProgressBar from './TaskProgressBar.vue';

const props = defineProps<{
  project: ProjectWithStats;
}>();

const progressPercent = computed(() => {
  if (props.project.task_count === 0) return 0;
  return Math.round((props.project.completed_task_count / props.project.task_count) * 100);
});

const displayName = computed(() => {
  return props.project.name || props.project.project_path.split('/').pop() || 'Unknown';
});

const repoDisplay = computed(() => {
  return props.project.github_repo || props.project.project_path;
});
</script>

<template>
  <router-link :to="`/project/${project.id}`" class="project-card-link">
    <TuiBox variant="single" :title="displayName" class="project-card">
      <div class="project-content">
        <div class="project-repo">{{ repoDisplay }}</div>

        <div class="card-stats">
          <div class="stat">
            <span class="stat-bracket">[</span>
            <span class="stat-count">{{ project.session_count }}</span>
            <span class="stat-bracket">]</span>
            <span class="stat-label">sessions</span>
          </div>
          <div class="stat">
            <span class="stat-bracket">[</span>
            <span class="stat-count">{{ project.plan_count }}</span>
            <span class="stat-bracket">]</span>
            <span class="stat-label">plans</span>
          </div>
          <div class="stat">
            <span class="stat-bracket">[</span>
            <span class="stat-count stat-count--highlight">{{ project.completed_task_count }}/{{ project.task_count }}</span>
            <span class="stat-bracket">]</span>
            <span class="stat-label">tasks</span>
          </div>
        </div>

        <div class="progress-section">
          <TaskProgressBar :percent="progressPercent" />
        </div>
      </div>
    </TuiBox>
  </router-link>
</template>

<style scoped>
.project-card-link {
  display: block;
  text-decoration: none;
  color: inherit;
  transition: transform var(--tui-duration-fast);
}

.project-card-link:hover {
  transform: translateY(-2px);
  text-decoration: none;
}

.project-card-link:hover :deep(.tui-box) {
  text-shadow:
    0 0 2px var(--tui-theme-primary-glow),
    0 0 4px var(--tui-theme-primary-glow);
}

.project-content {
  display: flex;
  flex-direction: column;
  gap: var(--tui-space-3);
}

.project-repo {
  font-size: var(--tui-font-size-xs);
  color: var(--tui-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-stats {
  display: flex;
  flex-direction: column;
  gap: var(--tui-space-1);
}

.stat {
  display: flex;
  align-items: center;
  gap: var(--tui-space-1);
  font-size: var(--tui-font-size-sm);
}

.stat-bracket {
  color: var(--tui-text-muted);
}

.stat-count {
  color: var(--tui-text-primary);
  font-weight: var(--tui-font-weight-semibold);
  min-width: 3ch;
}

.stat-count--highlight {
  color: var(--tui-theme-primary);
}

.stat-label {
  color: var(--tui-text-secondary);
}

.progress-section {
  padding-top: var(--tui-space-2);
  border-top: 1px dashed var(--tui-border-muted);
}
</style>
