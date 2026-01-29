<script setup lang="ts">

type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug';

interface LogEntry {
  id: string | number;
  level: LogLevel;
  message: string;
  timestamp?: Date | string;
}

withDefaults(defineProps<{
  entries: LogEntry[];
  showTimestamp?: boolean;
  maxHeight?: string;
}>(), {
  showTimestamp: true,
  maxHeight: '300px'
});

function formatTimestamp(timestamp?: Date | string): string {
  if (!timestamp) return '';
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function getLevelPrefix(level: LogLevel): string {
  switch (level) {
    case 'success': return '[✓]';
    case 'warning': return '[!]';
    case 'error': return '[✗]';
    case 'debug': return '[D]';
    default: return '[i]';
  }
}

const levelColors: Record<LogLevel, string> = {
  info: 'var(--tui-cyan-base)',
  success: 'var(--tui-success)',
  warning: 'var(--tui-warning)',
  error: 'var(--tui-error)',
  debug: 'var(--tui-text-muted)'
};
</script>

<template>
  <div class="tui-console" :style="{ maxHeight }">
    <div
      v-for="entry in entries"
      :key="entry.id"
      class="tui-console__entry"
      :class="`tui-console__entry--${entry.level}`"
    >
      <span v-if="showTimestamp && entry.timestamp" class="tui-console__timestamp">
        {{ formatTimestamp(entry.timestamp) }}
      </span>
      <span
        class="tui-console__level"
        :style="{ color: levelColors[entry.level] }"
      >
        {{ getLevelPrefix(entry.level) }}
      </span>
      <span class="tui-console__message">{{ entry.message }}</span>
    </div>
    <div v-if="entries.length === 0" class="tui-console__empty">
      No log entries
    </div>
  </div>
</template>

<style scoped>
.tui-console {
  font-family: var(--tui-font-mono);
  font-size: var(--tui-font-size-sm);
  line-height: var(--tui-line-height-relaxed);
  background: var(--tui-bg-elevated);
  padding: var(--tui-space-2);
  overflow-y: auto;
}

.tui-console__entry {
  display: flex;
  gap: var(--tui-space-2);
  padding: var(--tui-space-1) 0;
}

.tui-console__timestamp {
  color: var(--tui-text-muted);
  flex-shrink: 0;
}

.tui-console__level {
  flex-shrink: 0;
  font-weight: var(--tui-font-weight-semibold);
}

.tui-console__message {
  color: var(--tui-text-primary);
  word-break: break-word;
}

.tui-console__entry--error .tui-console__message {
  color: var(--tui-error);
}

.tui-console__entry--warning .tui-console__message {
  color: var(--tui-warning);
}

.tui-console__entry--debug .tui-console__message {
  color: var(--tui-text-muted);
}

.tui-console__empty {
  color: var(--tui-text-muted);
  text-align: center;
  padding: var(--tui-space-4);
}
</style>
