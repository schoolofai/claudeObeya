<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { Session } from '../composables/useProjects';
import TimelineCard from './TimelineCard.vue';

const props = defineProps<{
  sessions: Session[];
  projectId: number;
}>();

const scrollContainer = ref<HTMLElement>();

// Sort sessions oldest → newest (left to right)
const sortedSessions = computed(() =>
  [...props.sessions].sort((a, b) => a.created_at - b.created_at)
);

// Session metrics: plan and task counts
interface SessionMetrics {
  planCount: number;
  taskCount: number;
}

const sessionMetrics = ref<Map<number, SessionMetrics>>(new Map());
const metricsLoading = ref(false);

async function fetchSessionMetrics() {
  if (props.sessions.length === 0) return;

  metricsLoading.value = true;

  try {
    // Fetch details for each session to get plan/task counts
    const promises = props.sessions.map(async (session) => {
      try {
        const res = await fetch(`/api/sessions/${session.session_uuid}?details=true`);
        if (!res.ok) return { id: session.id, planCount: 0, taskCount: 0 };

        const data = await res.json();
        return {
          id: session.id,
          planCount: data.session?.plans?.length || 0,
          taskCount: data.session?.tasks?.length || 0,
        };
      } catch {
        return { id: session.id, planCount: 0, taskCount: 0 };
      }
    });

    const results = await Promise.all(promises);
    const newMetrics = new Map<number, SessionMetrics>();
    results.forEach((r) => {
      newMetrics.set(r.id, { planCount: r.planCount, taskCount: r.taskCount });
    });
    sessionMetrics.value = newMetrics;
  } finally {
    metricsLoading.value = false;
  }
}

// Time markers calculation
interface TimeMarker {
  label: string;
  position: number;
}

const timeMarkers = computed((): TimeMarker[] => {
  if (sortedSessions.value.length === 0) return [];

  const sessions = sortedSessions.value;
  const markers: TimeMarker[] = [];
  const seenDates = new Set<string>();

  sessions.forEach((session, index) => {
    const date = new Date(session.created_at);
    const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (!seenDates.has(dateKey)) {
      seenDates.add(dateKey);
      markers.push({
        label: dateKey,
        position: index,
      });
    }
  });

  return markers;
});

// Scroll controls
function scrollLeft() {
  scrollContainer.value?.scrollBy({ left: -300, behavior: 'smooth' });
}

function scrollRight() {
  scrollContainer.value?.scrollBy({ left: 300, behavior: 'smooth' });
}

// Keyboard navigation
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft') {
    scrollLeft();
  } else if (event.key === 'ArrowRight') {
    scrollRight();
  }
}

onMounted(() => {
  fetchSessionMetrics();
});

// Refetch metrics when sessions change
watch(() => props.sessions, () => {
  fetchSessionMetrics();
}, { deep: true });
</script>

<template>
  <div class="horizontal-timeline" @keydown="handleKeydown" tabindex="0">
    <div class="timeline-header">
      <span class="header-icon">┌─</span>
      <span class="header-title">SESSION TIMELINE</span>
      <span class="header-count">[{{ sessions.length }}]</span>
      <span class="header-line">────────────────────</span>
      <div class="scroll-controls">
        <button
          class="scroll-btn"
          @click="scrollLeft"
          aria-label="Scroll timeline left"
          :disabled="sessions.length === 0"
        >
          ◄
        </button>
        <button
          class="scroll-btn"
          @click="scrollRight"
          aria-label="Scroll timeline right"
          :disabled="sessions.length === 0"
        >
          ►
        </button>
      </div>
    </div>

    <div v-if="sortedSessions.length === 0" class="timeline-empty">
      <span class="empty-icon">[i]</span>
      <span>No sessions recorded yet</span>
    </div>

    <div v-else class="timeline-container" ref="scrollContainer">
      <div class="timeline-track">
        <!-- Time axis with markers -->
        <div class="timeline-axis">
          <div
            v-for="marker in timeMarkers"
            :key="marker.label"
            class="time-marker"
            :style="{ gridColumn: marker.position * 2 + 1 }"
          >
            <span class="marker-tick">│</span>
            <span class="marker-label">{{ marker.label }}</span>
          </div>
        </div>

        <!-- Timeline connector line -->
        <div class="timeline-line">
          <span class="line-start">├</span>
          <span class="line-middle"></span>
          <span class="line-end">┤</span>
        </div>

        <!-- Session cards -->
        <div class="timeline-cards">
          <template v-for="(session, index) in sortedSessions" :key="session.id">
            <div v-if="index > 0" class="timeline-connector">
              <span class="connector-line">────</span>
            </div>
            <TimelineCard
              :session="session"
              :plan-count="sessionMetrics.get(session.id)?.planCount || 0"
              :task-count="sessionMetrics.get(session.id)?.taskCount || 0"
            />
          </template>
        </div>
      </div>
    </div>

    <div class="timeline-hint">
      <span>Click to view</span>
      <span class="hint-separator">·</span>
      <span>Ctrl/Cmd+Click for new tab</span>
      <span class="hint-separator">·</span>
      <span>← → to scroll</span>
    </div>
  </div>
</template>

<style scoped>
.horizontal-timeline {
  margin-top: var(--tui-space-6);
  outline: none;
}

.horizontal-timeline:focus-visible {
  outline: 1px dashed var(--tui-theme-primary-dim);
  outline-offset: 4px;
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

.scroll-controls {
  display: flex;
  gap: var(--tui-space-1);
}

.scroll-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 24px;
  background: var(--tui-bg-elevated);
  border: 1px solid var(--tui-border-muted);
  color: var(--tui-text-secondary);
  font-family: var(--tui-font-mono);
  font-size: var(--tui-font-size-sm);
  cursor: pointer;
  transition: all var(--tui-duration-fast);
}

.scroll-btn:hover:not(:disabled) {
  border-color: var(--tui-theme-primary);
  color: var(--tui-theme-primary);
}

.scroll-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.timeline-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--tui-space-2);
  padding: var(--tui-space-8);
  text-align: center;
  color: var(--tui-text-muted);
  background: var(--tui-bg-surface);
  border: 1px dashed var(--tui-border-muted);
}

.empty-icon {
  color: var(--tui-text-secondary);
}

.timeline-container {
  overflow-x: auto;
  overflow-y: hidden;
  padding: var(--tui-space-4) 0;
  scrollbar-width: thin;
  scrollbar-color: var(--tui-theme-primary-dim) var(--tui-bg-surface);
}

.timeline-container::-webkit-scrollbar {
  height: 8px;
}

.timeline-container::-webkit-scrollbar-track {
  background: var(--tui-bg-surface);
}

.timeline-container::-webkit-scrollbar-thumb {
  background: var(--tui-theme-primary-dim);
  border-radius: 4px;
}

.timeline-track {
  display: flex;
  flex-direction: column;
  min-width: max-content;
  padding: 0 var(--tui-space-4);
}

.timeline-axis {
  display: flex;
  align-items: flex-end;
  height: 32px;
  margin-bottom: var(--tui-space-1);
  padding-left: 80px; /* Offset for first card */
}

.time-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 180px;
}

.marker-tick {
  color: var(--tui-border-muted);
  font-size: var(--tui-font-size-xs);
}

.marker-label {
  font-size: var(--tui-font-size-xs);
  color: var(--tui-text-muted);
  font-family: var(--tui-font-mono);
}

.timeline-line {
  display: flex;
  align-items: center;
  color: var(--tui-theme-primary-dim);
  margin-bottom: var(--tui-space-2);
  height: 16px;
}

.line-start,
.line-end {
  flex-shrink: 0;
}

.line-middle {
  flex: 1;
  height: 1px;
  background: linear-gradient(
    to right,
    var(--tui-theme-primary-dim),
    var(--tui-theme-primary),
    var(--tui-theme-primary-dim)
  );
}

.timeline-cards {
  display: flex;
  align-items: flex-start;
}

.timeline-connector {
  display: flex;
  align-items: center;
  padding: 0 var(--tui-space-1);
}

.connector-line {
  color: var(--tui-theme-primary-dim);
  font-family: var(--tui-font-mono);
}

.timeline-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--tui-space-2);
  margin-top: var(--tui-space-3);
  font-size: var(--tui-font-size-xs);
  color: var(--tui-text-muted);
  font-family: var(--tui-font-mono);
}

.hint-separator {
  color: var(--tui-border-muted);
}
</style>
