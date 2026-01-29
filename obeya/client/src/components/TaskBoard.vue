<script setup lang="ts">
import { computed } from 'vue';
import type { Task } from '../composables/useProjects';
import TaskCard from './TaskCard.vue';

const props = defineProps<{
  tasks: Task[];
}>();

const pendingTasks = computed(() =>
  props.tasks.filter((t) => t.status === 'pending')
);

const inProgressTasks = computed(() =>
  props.tasks.filter((t) => t.status === 'in_progress')
);

const completedTasks = computed(() =>
  props.tasks.filter((t) => t.status === 'completed')
);
</script>

<template>
  <div class="task-board">
    <div class="board-header">
      <span class="board-icon">┌─</span>
      <span class="board-title">TASKS</span>
      <span class="board-line">────────────────</span>
    </div>
    <div class="board-columns">
      <div class="column pending">
        <div class="column-header">
          <span class="column-icon">○</span>
          <span class="column-title">PENDING</span>
          <span class="column-count">[{{ pendingTasks.length }}]</span>
        </div>
        <div class="column-content">
          <TaskCard v-for="task in pendingTasks" :key="task.id" :task="task" />
          <div v-if="pendingTasks.length === 0" class="empty-column">
            ░░░ empty ░░░
          </div>
        </div>
      </div>

      <div class="column in-progress">
        <div class="column-header">
          <span class="column-icon">▶</span>
          <span class="column-title">IN PROGRESS</span>
          <span class="column-count">[{{ inProgressTasks.length }}]</span>
        </div>
        <div class="column-content">
          <TaskCard
            v-for="task in inProgressTasks"
            :key="task.id"
            :task="task"
          />
          <div v-if="inProgressTasks.length === 0" class="empty-column">
            ░░░ empty ░░░
          </div>
        </div>
      </div>

      <div class="column completed">
        <div class="column-header">
          <span class="column-icon">✓</span>
          <span class="column-title">COMPLETED</span>
          <span class="column-count">[{{ completedTasks.length }}]</span>
        </div>
        <div class="column-content">
          <TaskCard
            v-for="task in completedTasks"
            :key="task.id"
            :task="task"
          />
          <div v-if="completedTasks.length === 0" class="empty-column">
            ░░░ empty ░░░
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-board {
  margin-top: var(--tui-space-2);
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.board-header {
  display: flex;
  align-items: center;
  gap: var(--tui-space-2);
  margin-bottom: var(--tui-space-3);
}

.board-icon {
  color: var(--tui-text-muted);
}

.board-title {
  font-size: var(--tui-font-size-xs);
  font-weight: var(--tui-font-weight-semibold);
  color: var(--tui-theme-primary);
  letter-spacing: var(--tui-letter-spacing-wider);
}

.board-line {
  color: var(--tui-text-muted);
  overflow: hidden;
}

.board-columns {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--tui-space-3);
  flex: 1;
  min-height: 0;
}

@media (max-width: 768px) {
  .board-columns {
    grid-template-columns: 1fr;
  }
}

.column {
  background: var(--tui-bg-elevated);
  border: 1px solid var(--tui-border-muted);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.column-header {
  display: flex;
  align-items: center;
  gap: var(--tui-space-2);
  padding: var(--tui-space-2) var(--tui-space-3);
  border-bottom: 1px solid var(--tui-border-muted);
  font-size: var(--tui-font-size-xs);
  font-weight: var(--tui-font-weight-semibold);
}

.column-icon {
  font-size: var(--tui-font-size-sm);
}

.column-title {
  color: var(--tui-text-secondary);
  letter-spacing: var(--tui-letter-spacing-wide);
}

.column-count {
  margin-left: auto;
  color: var(--tui-text-muted);
}

.column.pending .column-header {
  border-bottom-color: var(--tui-warning);
}

.column.pending .column-icon {
  color: var(--tui-warning);
}

.column.in-progress .column-header {
  border-bottom-color: var(--tui-info);
}

.column.in-progress .column-icon {
  color: var(--tui-info);
}

.column.completed .column-header {
  border-bottom-color: var(--tui-success);
}

.column.completed .column-icon {
  color: var(--tui-success);
}

.column-content {
  padding: var(--tui-space-2);
  display: flex;
  flex-direction: column;
  gap: var(--tui-space-2);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.empty-column {
  padding: var(--tui-space-4);
  text-align: center;
  color: var(--tui-text-muted);
  font-size: var(--tui-font-size-xs);
}
</style>
