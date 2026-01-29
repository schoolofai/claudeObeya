<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { Session, Plan, Task } from '../composables/useProjects';
import { TuiBadge, TuiSpinner } from './tui';
import TaskBoard from './TaskBoard.vue';
import PlanDetailModal from './PlanDetailModal.vue';

const props = defineProps<{
  session: Session;
}>();

const expanded = ref(false);
const plans = ref<Plan[]>([]);
const tasks = ref<Task[]>([]);
const loading = ref(false);
const copied = ref(false);
const selectedPlan = ref<Plan | null>(null);
const showPlanModal = ref(false);

const statusVariant = computed(() => {
  return props.session.status === 'active' ? 'success' : 'muted';
});

const statusIcon = computed(() => {
  return props.session.status === 'active' ? '●' : '○';
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

const displayName = computed(() => {
  return props.session.summary || props.session.first_prompt || 'Untitled Session';
});

async function copySessionId() {
  try {
    await navigator.clipboard.writeText(props.session.session_uuid);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    // Clipboard API not available
  }
}

async function fetchDetails() {
  if (loading.value) return;
  loading.value = true;

  try {
    const response = await fetch(`/api/sessions/${props.session.session_uuid}?details=true`);
    if (response.ok) {
      const data = await response.json();
      plans.value = data.session.plans || [];
      tasks.value = data.session.tasks || [];
    }
  } catch {
    // Ignore errors
  } finally {
    loading.value = false;
  }
}

function toggle() {
  expanded.value = !expanded.value;
  if (expanded.value && tasks.value.length === 0) {
    fetchDetails();
  }
}

function handleObeyaEvent() {
  if (expanded.value) {
    fetchDetails();
  }
}

onMounted(() => {
  window.addEventListener('obeya-event', handleObeyaEvent);
});

onUnmounted(() => {
  window.removeEventListener('obeya-event', handleObeyaEvent);
});

function openPlanDetail(plan: Plan) {
  selectedPlan.value = plan;
  showPlanModal.value = true;
}

function closePlanModal() {
  showPlanModal.value = false;
  selectedPlan.value = null;
}
</script>

<template>
  <div class="session-card" :class="{ expanded }">
    <div class="card-header" @click="toggle">
      <div class="header-left">
        <TuiBadge :variant="statusVariant" :icon="statusIcon" :glow="session.status === 'active'">
          {{ session.status.toUpperCase() }}
        </TuiBadge>
        <div class="session-info">
          <span class="session-name">{{ displayName }}</span>
          <div class="session-id-row">
            <span class="session-id">[{{ session.session_uuid }}]</span>
            <button
              class="copy-btn"
              @click.stop="copySessionId"
              title="Copy session ID"
            >
              <span v-if="!copied">📋</span>
              <span v-else>✓</span>
            </button>
          </div>
        </div>
        <span v-if="session.git_branch" class="branch-badge">
          <span class="branch-icon">⎇</span> {{ session.git_branch }}
        </span>
      </div>
      <div class="header-right">
        <span class="session-date">{{ formattedDate }}</span>
        <span class="expand-icon">{{ expanded ? '▲' : '▼' }}</span>
      </div>
    </div>

    <div v-if="expanded" class="card-content">
      <div v-if="loading" class="loading">
        <TuiSpinner variant="braille" :speed="80">Loading session details...</TuiSpinner>
      </div>

      <div v-else>
        <div v-if="plans.length > 0" class="plans-section">
          <div class="section-header">
            <span class="section-icon">┌─</span>
            <span class="section-title">PLANS</span>
            <span class="section-line">────────────────</span>
          </div>
          <div class="plans-list">
            <div
              v-for="plan in plans"
              :key="plan.id"
              class="plan-item plan-item--clickable"
              @click="openPlanDetail(plan)"
            >
              <span class="plan-bullet">├─</span>
              <span class="plan-name">{{ plan.plan_name }}</span>
              <span class="plan-view-hint">[View]</span>
            </div>
          </div>
        </div>

        <TaskBoard v-if="tasks.length > 0" :tasks="tasks" />

        <div v-if="plans.length === 0 && tasks.length === 0" class="no-content">
          [i] No plans or tasks in this session
        </div>
      </div>
    </div>

    <!-- Plan Detail Modal -->
    <PlanDetailModal
      :plan="selectedPlan"
      :visible="showPlanModal"
      @close="closePlanModal"
    />
  </div>
</template>

<style scoped>
.session-card {
  background: var(--tui-bg-surface);
  border: 1px solid var(--tui-border-muted);
  overflow: hidden;
  transition: border-color var(--tui-duration-fast);
}

.session-card.expanded {
  border-color: var(--tui-theme-primary-dim);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--tui-space-3) var(--tui-space-4);
  cursor: pointer;
  user-select: none;
}

.card-header:hover {
  background: var(--tui-bg-elevated);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--tui-space-3);
}

.session-info {
  display: flex;
  flex-direction: column;
  gap: var(--tui-space-1);
}

.session-name {
  font-size: var(--tui-font-size-base);
  font-weight: var(--tui-font-weight-medium);
  color: var(--tui-text-primary);
}

.session-id-row {
  display: flex;
  align-items: center;
  gap: var(--tui-space-2);
}

.session-id {
  font-size: var(--tui-font-size-xs);
  font-family: var(--tui-font-mono);
  color: var(--tui-text-muted);
  opacity: 0.7;
}

.copy-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: var(--tui-space-1);
  font-size: var(--tui-font-size-xs);
  opacity: 0.5;
  transition: opacity var(--tui-duration-fast);
  line-height: 1;
}

.copy-btn:hover {
  opacity: 1;
}

.branch-badge {
  display: flex;
  align-items: center;
  gap: var(--tui-space-1);
  font-size: var(--tui-font-size-xs);
  padding: var(--tui-space-1) var(--tui-space-2);
  background: var(--tui-bg-elevated);
  color: var(--tui-text-secondary);
}

.branch-icon {
  color: var(--tui-purple-base);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--tui-space-3);
}

.session-date {
  font-size: var(--tui-font-size-xs);
  color: var(--tui-text-muted);
}

.expand-icon {
  font-size: var(--tui-font-size-xs);
  color: var(--tui-text-muted);
}

.card-content {
  padding: var(--tui-space-4);
  border-top: 1px dashed var(--tui-border-muted);
}

.loading {
  text-align: center;
  color: var(--tui-text-muted);
  padding: var(--tui-space-3);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--tui-space-2);
  margin-bottom: var(--tui-space-3);
}

.section-icon {
  color: var(--tui-text-muted);
}

.section-title {
  font-size: var(--tui-font-size-xs);
  font-weight: var(--tui-font-weight-semibold);
  color: var(--tui-theme-primary);
  letter-spacing: var(--tui-letter-spacing-wider);
}

.section-line {
  color: var(--tui-text-muted);
  overflow: hidden;
}

.plans-section {
  margin-bottom: var(--tui-space-4);
}

.plans-list {
  display: flex;
  flex-direction: column;
  gap: var(--tui-space-2);
}

.plan-item {
  display: flex;
  align-items: center;
  gap: var(--tui-space-2);
  padding: var(--tui-space-2) var(--tui-space-3);
  background: var(--tui-bg-elevated);
  font-size: var(--tui-font-size-sm);
}

.plan-bullet {
  color: var(--tui-text-muted);
}

.plan-name {
  flex: 1;
  color: var(--tui-text-primary);
}

.plan-item--clickable {
  cursor: pointer;
  transition: background-color var(--tui-duration-fast), border-color var(--tui-duration-fast);
}

.plan-item--clickable:hover {
  background: var(--tui-bg-surface);
  border-left: 2px solid var(--tui-theme-primary);
}

.plan-item--clickable:hover .plan-name {
  color: var(--tui-theme-primary-bright);
}

.plan-view-hint {
  font-size: var(--tui-font-size-xs);
  color: var(--tui-text-muted);
  opacity: 0;
  transition: opacity var(--tui-duration-fast);
}

.plan-item--clickable:hover .plan-view-hint {
  opacity: 1;
  color: var(--tui-theme-primary);
}

.no-content {
  text-align: center;
  color: var(--tui-text-muted);
  padding: var(--tui-space-3);
  font-size: var(--tui-font-size-sm);
}
</style>
