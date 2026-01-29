<script setup lang="ts">
import TaskProgressBar from './TaskProgressBar.vue';
import { computed } from 'vue';

const props = defineProps<{
  totalProjects: number;
  activeSessions: number;
  inProgressPlans: number;
  totalTasks: number;
  completedTasks: number;
}>();

const taskPercent = computed(() => {
  if (props.totalTasks === 0) return 0;
  return Math.round((props.completedTasks / props.totalTasks) * 100);
});
</script>

<template>
  <div class="stats-summary">
    <div class="stats-row">
      <div class="stat-item">
        <span class="stat-bracket">[</span>
        <span class="stat-label">PROJECTS:</span>
        <span class="stat-value">{{ totalProjects }}</span>
        <span class="stat-bracket">]</span>
      </div>
      <span class="stat-divider">│</span>
      <div class="stat-item">
        <span class="stat-bracket">[</span>
        <span class="stat-label">ACTIVE:</span>
        <span class="stat-value stat-value--highlight">{{ activeSessions }}</span>
        <span class="stat-bracket">]</span>
      </div>
      <span class="stat-divider">│</span>
      <div class="stat-item">
        <span class="stat-bracket">[</span>
        <span class="stat-label">PLANS:</span>
        <span class="stat-value">{{ inProgressPlans }}</span>
        <span class="stat-bracket">]</span>
      </div>
      <span class="stat-divider">│</span>
      <div class="stat-item">
        <span class="stat-bracket">[</span>
        <span class="stat-label">TASKS:</span>
        <span class="stat-value stat-value--success">{{ completedTasks }}/{{ totalTasks }}</span>
        <span class="stat-bracket">]</span>
      </div>
    </div>
    <div class="progress-row">
      <span class="progress-label">Progress:</span>
      <TaskProgressBar :percent="taskPercent" />
    </div>
  </div>
</template>

<style scoped>
.stats-summary {
  display: flex;
  flex-direction: column;
  gap: var(--tui-space-3);
  padding: var(--tui-space-3) var(--tui-space-4);
  background: var(--tui-bg-surface);
  border: 1px solid var(--tui-border-muted);
  margin-bottom: var(--tui-space-6);
}

.stats-row {
  display: flex;
  align-items: center;
  gap: var(--tui-space-3);
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--tui-space-1);
}

.stat-bracket {
  color: var(--tui-text-muted);
}

.stat-label {
  font-size: var(--tui-font-size-xs);
  color: var(--tui-text-secondary);
  letter-spacing: var(--tui-letter-spacing-wide);
}

.stat-value {
  font-size: var(--tui-font-size-sm);
  font-weight: var(--tui-font-weight-semibold);
  color: var(--tui-text-primary);
}

.stat-value--highlight {
  color: var(--tui-cyan-base);
  text-shadow: 0 0 4px var(--tui-cyan-glow);
}

.stat-value--success {
  color: var(--tui-success);
}

.stat-divider {
  color: var(--tui-border-muted);
}

.progress-row {
  display: flex;
  align-items: center;
  gap: var(--tui-space-3);
  padding-top: var(--tui-space-2);
  border-top: 1px dashed var(--tui-border-muted);
}

.progress-label {
  font-size: var(--tui-font-size-xs);
  color: var(--tui-text-secondary);
}

@media (max-width: 768px) {
  .stats-row {
    gap: var(--tui-space-2);
  }

  .stat-divider {
    display: none;
  }
}
</style>
