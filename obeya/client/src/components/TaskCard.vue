<script setup lang="ts">
import { computed } from 'vue';
import type { Task } from '../composables/useProjects';
import { TuiBadge, TuiSpinner } from './tui';

const props = defineProps<{
  task: Task;
}>();

const blockedByList = computed(() => {
  if (!props.task.blocked_by) return [];
  try {
    return JSON.parse(props.task.blocked_by) as string[];
  } catch {
    return [];
  }
});

const statusVariant = computed(() => {
  switch (props.task.status) {
    case 'completed': return 'success';
    case 'in_progress': return 'info';
    default: return 'warning';
  }
});

const statusIcon = computed(() => {
  switch (props.task.status) {
    case 'completed': return '✓';
    case 'in_progress': return '▶';
    default: return '○';
  }
});
</script>

<template>
  <div class="task-card" :class="`task-card--${task.status.replace('_', '-')}`">
    <div class="task-header">
      <span class="task-id">#{{ task.task_id }}</span>
      <TuiBadge :variant="statusVariant" :icon="statusIcon">
        {{ task.status.toUpperCase().replace('_', ' ') }}
      </TuiBadge>
    </div>
    <div class="task-subject">{{ task.subject }}</div>
    <div v-if="task.active_form && task.status === 'in_progress'" class="task-active">
      <TuiSpinner variant="braille" :speed="80" />
      <span>{{ task.active_form }}</span>
    </div>
    <div v-if="blockedByList.length > 0" class="task-blocked">
      <span class="blocked-icon">[!]</span>
      <span>blocked by {{ blockedByList.map(id => `#${id}`).join(', ') }}</span>
    </div>
  </div>
</template>

<style scoped>
.task-card {
  padding: var(--tui-space-3);
  background: var(--tui-bg-surface);
  border: 1px solid var(--tui-border-muted);
  border-left: 3px solid var(--tui-border-muted);
}

.task-card--pending {
  border-left-color: var(--tui-warning);
}

.task-card--in-progress {
  border-left-color: var(--tui-info);
}

.task-card--completed {
  border-left-color: var(--tui-success);
  opacity: 0.7;
}

.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--tui-space-2);
}

.task-id {
  font-size: var(--tui-font-size-sm);
  font-weight: var(--tui-font-weight-semibold);
  color: var(--tui-purple-base);
}

.task-subject {
  font-size: var(--tui-font-size-sm);
  color: var(--tui-text-primary);
  line-height: var(--tui-line-height-base);
}

.task-active {
  display: flex;
  align-items: center;
  gap: var(--tui-space-2);
  margin-top: var(--tui-space-2);
  font-size: var(--tui-font-size-xs);
  color: var(--tui-cyan-base);
}

.task-blocked {
  display: flex;
  align-items: center;
  gap: var(--tui-space-1);
  margin-top: var(--tui-space-2);
  font-size: var(--tui-font-size-xs);
  color: var(--tui-error);
}

.blocked-icon {
  font-weight: var(--tui-font-weight-bold);
}
</style>
