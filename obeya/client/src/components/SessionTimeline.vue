<script setup lang="ts">
import { computed } from 'vue';
import type { Session } from '../composables/useProjects';
import SessionCard from './SessionCard.vue';

const props = defineProps<{
  sessions: Session[];
}>();

const sortedSessions = computed(() => {
  return [...props.sessions].sort((a, b) => b.created_at - a.created_at);
});
</script>

<template>
  <div class="session-timeline">
    <div class="timeline-header">
      <span class="header-icon">┌─</span>
      <span class="header-title">SESSIONS</span>
      <span class="header-count">[{{ sortedSessions.length }}]</span>
      <span class="header-line">────────────────────────────────────────</span>
    </div>
    <div v-if="sortedSessions.length === 0" class="no-sessions">
      <span class="empty-icon">[i]</span>
      <span>No sessions recorded yet</span>
    </div>
    <div v-else class="timeline-list">
      <SessionCard
        v-for="session in sortedSessions"
        :key="session.id"
        :session="session"
      />
    </div>
  </div>
</template>

<style scoped>
.session-timeline {
  margin-top: var(--tui-space-6);
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: var(--tui-space-2);
  margin-bottom: var(--tui-space-4);
}

.header-icon {
  color: var(--tui-text-muted);
}

.header-title {
  font-size: var(--tui-font-size-sm);
  font-weight: var(--tui-font-weight-semibold);
  color: var(--tui-theme-primary);
  letter-spacing: var(--tui-letter-spacing-wider);
}

.header-count {
  color: var(--tui-text-muted);
}

.header-line {
  flex: 1;
  color: var(--tui-text-muted);
  overflow: hidden;
}

.no-sessions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--tui-space-2);
  padding: var(--tui-space-6);
  text-align: center;
  color: var(--tui-text-muted);
  background: var(--tui-bg-surface);
  border: 1px dashed var(--tui-border-muted);
}

.empty-icon {
  color: var(--tui-text-secondary);
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: var(--tui-space-3);
}
</style>
