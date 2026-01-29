<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { Session } from '../composables/useProjects';
import { TuiBadge } from './tui';

const props = defineProps<{
  session: Session;
  planCount: number;
  taskCount: number;
}>();

const router = useRouter();

const isActive = computed(() => props.session.status === 'active');

const displayName = computed(() => {
  const name = props.session.summary || props.session.first_prompt || 'Untitled Session';
  return name.length > 24 ? name.slice(0, 24) + '...' : name;
});

const formattedDate = computed(() => {
  const date = new Date(props.session.created_at);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
});

function handleClick(event: MouseEvent) {
  const route = {
    name: 'session-detail',
    params: {
      projectId: props.session.project_id.toString(),
      uuid: props.session.session_uuid,
    },
  };

  if (event.ctrlKey || event.metaKey) {
    const href = router.resolve(route).href;
    window.open(href, '_blank');
  } else {
    router.push(route);
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    handleClick(event as unknown as MouseEvent);
  }
}
</script>

<template>
  <div
    class="timeline-card"
    :class="{ active: isActive }"
    tabindex="0"
    role="button"
    :aria-label="`Session: ${displayName}, ${isActive ? 'active' : 'ended'}, ${planCount} plans, ${taskCount} tasks`"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <TuiBadge
      :variant="isActive ? 'success' : 'muted'"
      :icon="isActive ? '●' : '○'"
      :glow="isActive"
    >
      {{ isActive ? 'ACTIVE' : 'ended' }}
    </TuiBadge>

    <span class="card-name" :title="session.summary || session.first_prompt || 'Untitled Session'">
      {{ displayName }}
    </span>

    <div class="card-meta">
      <span v-if="planCount > 0" class="meta-item meta-item--plans">
        <span class="meta-icon">P</span>
        <span class="meta-value">{{ planCount }}</span>
      </span>
      <span v-if="taskCount > 0" class="meta-item meta-item--tasks">
        <span class="meta-bracket">[</span>
        <span class="meta-value">{{ taskCount }}</span>
        <span class="meta-bracket">]</span>
      </span>
      <span v-if="planCount === 0 && taskCount === 0" class="meta-empty">--</span>
    </div>

    <span class="card-date">{{ formattedDate }}</span>
  </div>
</template>

<style scoped>
.timeline-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--tui-space-2);
  padding: var(--tui-space-3) var(--tui-space-4);
  min-width: 160px;
  max-width: 200px;
  background: var(--tui-bg-surface);
  border: 1px solid var(--tui-border-muted);
  cursor: pointer;
  transition: all var(--tui-duration-fast);
  outline: none;
}

.timeline-card:hover {
  border-color: var(--tui-theme-primary);
  background: var(--tui-bg-elevated);
}

.timeline-card:focus-visible {
  border-color: var(--tui-theme-primary);
  box-shadow: 0 0 0 2px var(--tui-theme-primary-dim);
}

.timeline-card.active {
  border-color: var(--tui-success);
  box-shadow: 0 0 8px var(--tui-green-glow);
}

.timeline-card.active:hover {
  border-color: var(--tui-success);
  box-shadow: 0 0 12px var(--tui-green-glow);
}

.card-name {
  font-size: var(--tui-font-size-sm);
  font-weight: var(--tui-font-weight-medium);
  color: var(--tui-text-primary);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  line-height: 1.4;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: var(--tui-space-3);
  font-size: var(--tui-font-size-xs);
  font-family: var(--tui-font-mono);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: var(--tui-space-1);
}

.meta-item--plans {
  color: var(--tui-cyan-base);
}

.meta-item--tasks {
  color: var(--tui-text-muted);
}

.meta-icon {
  font-weight: var(--tui-font-weight-bold);
}

.meta-value {
  color: var(--tui-text-secondary);
}

.meta-bracket {
  color: var(--tui-text-muted);
}

.meta-empty {
  color: var(--tui-text-muted);
}

.card-date {
  font-size: var(--tui-font-size-xs);
  color: var(--tui-text-muted);
  font-family: var(--tui-font-mono);
}
</style>
