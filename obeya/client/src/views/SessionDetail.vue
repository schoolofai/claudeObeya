<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import type { Session, Plan, Task } from '../composables/useProjects';
import { TuiSpinner, TuiWindow, TuiBadge } from '../components/tui';
import TaskBoard from '../components/TaskBoard.vue';
import ResizableSplitPanel from '../components/ResizableSplitPanel.vue';
import PlanPanel from '../components/PlanPanel.vue';
import ExpandableTitle from '../components/ExpandableTitle.vue';

const route = useRoute();

const projectId = computed(() => route.params.projectId as string);
const sessionUuid = computed(() => route.params.uuid as string);

// State
const session = ref<Session | null>(null);
const plans = ref<Plan[]>([]);
const tasks = ref<Task[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const isPanelCollapsed = ref(false);
const splitPanelRef = ref<InstanceType<typeof ResizableSplitPanel> | null>(null);

// Computed display values
const sessionTitle = computed(() =>
  session.value?.summary || session.value?.first_prompt || 'Untitled Session'
);

const isActive = computed(() => session.value?.status === 'active');

const formattedDate = computed(() => {
  if (!session.value) return '';
  return new Date(session.value.created_at).toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
});

const truncatedUuid = computed(() => {
  const uuid = sessionUuid.value;
  return uuid.length > 12 ? `${uuid.slice(0, 8)}...${uuid.slice(-4)}` : uuid;
});

// Fetch session details
async function fetchDetails() {
  loading.value = true;
  error.value = null;

  try {
    const response = await fetch(`/api/sessions/${sessionUuid.value}?details=true`);
    if (!response.ok) {
      throw new Error(`Failed to fetch session: ${response.status}`);
    }

    const data = await response.json();
    session.value = data.session;
    plans.value = data.session?.plans || [];
    tasks.value = data.session?.tasks || [];
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load session';
    console.error('[SessionDetail] Error fetching details:', e);
  } finally {
    loading.value = false;
  }
}

// Handle real-time updates
function handleObeyaEvent(event: Event) {
  const customEvent = event as CustomEvent;
  const data = customEvent.detail;

  // Handle targeted session title updates
  if (data?.type === 'session_title_updated' && data.sessionUuid === sessionUuid.value) {
    if (session.value) {
      if (data.summary) {
        session.value.summary = data.summary;
      }
      if (data.firstPrompt) {
        session.value.first_prompt = data.firstPrompt;
      }
    }
    return;
  }

  // Full refresh for other events
  fetchDetails();
}

// Keyboard shortcut to toggle panel collapse
function handleKeydown(event: KeyboardEvent) {
  // 'p' key to toggle plan panel collapse (when not focused on input)
  if (event.key === 'p' && !isInputFocused()) {
    event.preventDefault();
    splitPanelRef.value?.toggleCollapse();
  }
}

function isInputFocused(): boolean {
  const activeElement = document.activeElement;
  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement?.getAttribute('contenteditable') === 'true'
  );
}

onMounted(() => {
  fetchDetails();
  window.addEventListener('obeya-event', handleObeyaEvent);
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('obeya-event', handleObeyaEvent);
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div class="session-detail">
    <!-- Back navigation -->
    <router-link :to="`/project/${projectId}`" class="back-link">
      <span class="back-arrow">←</span>
      <span>cd ..</span>
    </router-link>

    <!-- Loading state -->
    <div v-if="loading && !session" class="loading-state">
      <TuiSpinner variant="braille" :speed="80" :glow="true">
        Loading session...
      </TuiSpinner>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="error-state">
      <span class="error-icon">[✗]</span>
      <span class="error-text">ERROR: {{ error }}</span>
    </div>

    <!-- Session content -->
    <template v-else-if="session">
      <!-- Session header -->
      <TuiWindow
        title="Session Details"
        variant="double"
        :show-controls="false"
        :glow="isActive"
      >
        <div class="session-header">
          <!-- Expandable title at the top -->
          <ExpandableTitle :title="sessionTitle" :max-lines="4" />

          <div class="header-row">
            <TuiBadge
              :variant="isActive ? 'success' : 'muted'"
              :icon="isActive ? '●' : '○'"
              :glow="isActive"
            >
              {{ isActive ? 'ACTIVE' : 'ended' }}
            </TuiBadge>

            <span class="session-uuid" :title="sessionUuid">
              {{ truncatedUuid }}
            </span>

            <span v-if="session.git_branch" class="session-branch">
              <span class="branch-icon">⎇</span>
              {{ session.git_branch }}
            </span>
          </div>

          <div class="header-meta">
            <span class="meta-date">{{ formattedDate }}</span>
            <span v-if="session.model_name" class="meta-model">
              model: {{ session.model_name }}
            </span>
          </div>
        </div>
      </TuiWindow>

      <!-- Stats bar -->
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-icon">P</span>
          <span class="stat-label">Plans:</span>
          <span class="stat-value">{{ plans.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">T</span>
          <span class="stat-label">Tasks:</span>
          <span class="stat-value">{{ tasks.length }}</span>
        </div>
        <div class="stat-hint">
          Press <kbd>p</kbd> to toggle plans panel
        </div>
      </div>

      <!-- Main content area with resizable split panel -->
      <div class="session-content">
        <ResizableSplitPanel
          ref="splitPanelRef"
          storage-key="session-detail-plans"
          :default-left-width="350"
          :min-left-width="200"
          :max-left-width="600"
          :collapse-threshold="100"
          :collapsed-width="48"
          @collapse="isPanelCollapsed = $event"
        >
          <template #left="{ collapsed }">
            <PlanPanel :plans="plans" :collapsed="collapsed" />
          </template>

          <template #right>
            <div class="main-content">
              <TaskBoard v-if="tasks.length > 0" :tasks="tasks" />
              <div v-else class="empty-tasks">
                <span class="empty-icon">[i]</span>
                <span>No tasks in this session</span>
              </div>
            </div>
          </template>
        </ResizableSplitPanel>
      </div>
    </template>
  </div>
</template>

<style scoped>
.session-detail {
  max-width: 1400px;
  margin: 0 auto;
  padding-bottom: var(--tui-space-8);
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
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

.session-header {
  display: flex;
  flex-direction: column;
  gap: var(--tui-space-3);
}

.header-row {
  display: flex;
  align-items: center;
  gap: var(--tui-space-4);
  flex-wrap: wrap;
}

.session-uuid {
  font-family: var(--tui-font-mono);
  font-size: var(--tui-font-size-xs);
  color: var(--tui-text-muted);
  background: var(--tui-bg-elevated);
  padding: var(--tui-space-1) var(--tui-space-2);
  border: 1px solid var(--tui-border-muted);
}

.session-branch {
  display: flex;
  align-items: center;
  gap: var(--tui-space-1);
  font-size: var(--tui-font-size-xs);
  color: var(--tui-magenta-base);
}

.branch-icon {
  font-size: var(--tui-font-size-sm);
}

.header-meta {
  display: flex;
  align-items: center;
  gap: var(--tui-space-4);
  font-size: var(--tui-font-size-xs);
  color: var(--tui-text-muted);
}

.meta-model {
  color: var(--tui-cyan-base);
}

.stats-bar {
  display: flex;
  align-items: center;
  gap: var(--tui-space-6);
  margin-top: var(--tui-space-4);
  padding: var(--tui-space-3) var(--tui-space-4);
  background: var(--tui-bg-surface);
  border: 1px solid var(--tui-border-muted);
  font-family: var(--tui-font-mono);
  font-size: var(--tui-font-size-sm);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--tui-space-2);
}

.stat-icon {
  color: var(--tui-cyan-base);
  font-weight: var(--tui-font-weight-bold);
}

.stat-label {
  color: var(--tui-text-secondary);
}

.stat-value {
  color: var(--tui-text-primary);
  font-weight: var(--tui-font-weight-semibold);
}

.stat-hint {
  margin-left: auto;
  font-size: var(--tui-font-size-xs);
  color: var(--tui-text-muted);
}

.stat-hint kbd {
  display: inline-block;
  padding: 0 var(--tui-space-1);
  background: var(--tui-bg-elevated);
  border: 1px solid var(--tui-border-muted);
  border-radius: 2px;
  font-size: var(--tui-font-size-xs);
  color: var(--tui-theme-primary);
}

.session-content {
  margin-top: var(--tui-space-4);
  flex: 1;
  min-height: 400px; /* Reduced min for smaller screens */
  display: flex;
  flex-direction: column;
  background: var(--tui-bg-surface);
  border: 1px solid var(--tui-border-muted);
}

.main-content {
  height: 100%;
  padding: var(--tui-space-4);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.empty-tasks {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--tui-space-2);
  padding: var(--tui-space-16);
  color: var(--tui-text-muted);
  text-align: center;
}

.empty-icon {
  font-size: var(--tui-font-size-lg);
  color: var(--tui-text-secondary);
}

@media (max-width: 768px) {
  .stats-bar {
    flex-wrap: wrap;
  }

  .stat-hint {
    width: 100%;
    margin-left: 0;
    margin-top: var(--tui-space-2);
  }
}
</style>
