<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Plan } from '../composables/useProjects';
import { TuiSpinner, TuiMarkdown } from './tui';

const props = defineProps<{
  plans: Plan[];
  collapsed?: boolean;
}>();

const selectedPlanId = ref<number | null>(null);
const planContent = ref<string | null>(null);
const loading = ref(false);

// Auto-select first plan when plans change
watch(
  () => props.plans,
  (plans) => {
    if (plans.length > 0 && !selectedPlanId.value) {
      selectPlan(plans[0]);
    }
  },
  { immediate: true }
);

async function selectPlan(plan: Plan) {
  if (selectedPlanId.value === plan.id) return;

  selectedPlanId.value = plan.id;
  loading.value = true;

  try {
    // Use cached content if available
    if (plan.plan_content) {
      planContent.value = plan.plan_content;
    } else {
      // Fetch content from API
      const res = await fetch(`/api/plans/${plan.id}/content`);
      if (!res.ok) {
        throw new Error(`Failed to fetch plan content: ${res.status}`);
      }
      const data = await res.json();
      planContent.value = data.plan?.plan_content || null;
    }
  } catch (error) {
    console.error('[PlanPanel] Error fetching plan content:', error);
    planContent.value = null;
  } finally {
    loading.value = false;
  }
}

function openInNewTab() {
  if (selectedPlanId.value) {
    window.open(`/plan/${selectedPlanId.value}`, '_blank');
  }
}
</script>

<template>
  <!-- Don't render content when collapsed - parent handles collapsed UI -->
  <div v-if="!collapsed" class="plan-panel">
    <!-- Header with controls -->
    <div class="panel-header">
      <span class="panel-title">PLANS</span>
      <div class="panel-actions">
        <button
          class="action-btn"
          @click="openInNewTab"
          :disabled="!selectedPlanId"
          title="Open in new tab"
        >
          <span class="action-icon">↗</span>
        </button>
      </div>
    </div>

    <!-- Plan tabs (if multiple) -->
    <div v-if="plans.length > 1" class="plan-tabs">
      <button
        v-for="plan in plans"
        :key="plan.id"
        class="plan-tab"
        :class="{ active: selectedPlanId === plan.id }"
        @click="selectPlan(plan)"
      >
        <span class="tab-status" :class="plan.status">
          {{ plan.status === 'in_progress' ? '▶' : '✓' }}
        </span>
        <span class="tab-name">{{ plan.plan_name }}</span>
      </button>
    </div>

    <!-- Single plan name display -->
    <div v-else-if="plans.length === 1" class="single-plan">
      <span class="single-plan-status" :class="plans[0].status">
        {{ plans[0].status === 'in_progress' ? '▶' : '✓' }}
      </span>
      <span class="single-plan-name">{{ plans[0].plan_name }}</span>
    </div>

    <!-- Plan content viewer -->
    <div class="plan-content">
      <div v-if="loading" class="content-loading">
        <TuiSpinner variant="braille" :speed="80">Loading plan...</TuiSpinner>
      </div>
      <div v-else-if="planContent" class="content-markdown">
        <TuiMarkdown :content="planContent" />
      </div>
      <div v-else-if="plans.length === 0" class="content-empty">
        <span class="empty-icon">[i]</span>
        <span>No plans in this session</span>
      </div>
      <div v-else class="content-empty">
        <span class="empty-icon">[i]</span>
        <span>Select a plan to view</span>
      </div>
    </div>

    <!-- Footer hints -->
    <div class="panel-footer">
      <span class="hint">Drag divider to resize</span>
      <span class="hint">Double-click to collapse</span>
    </div>
  </div>
</template>

<style scoped>
.plan-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--tui-bg-surface);
}

/* Header */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--tui-space-2) var(--tui-space-3);
  background: var(--tui-bg-elevated);
  border-bottom: 1px solid var(--tui-border-muted);
  flex-shrink: 0;
}

.panel-title {
  font-family: var(--tui-font-mono);
  font-size: var(--tui-font-size-xs);
  font-weight: var(--tui-font-weight-bold);
  color: var(--tui-theme-primary);
  letter-spacing: var(--tui-letter-spacing-wider);
}

.panel-actions {
  display: flex;
  gap: var(--tui-space-1);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: 1px solid var(--tui-border-muted);
  color: var(--tui-text-secondary);
  cursor: pointer;
  font-family: var(--tui-font-mono);
  font-size: var(--tui-font-size-sm);
  transition: all var(--tui-duration-fast);
}

.action-btn:hover:not(:disabled) {
  border-color: var(--tui-theme-primary);
  color: var(--tui-theme-primary);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Plan tabs */
.plan-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--tui-space-1);
  padding: var(--tui-space-2) var(--tui-space-3);
  background: var(--tui-bg-surface);
  border-bottom: 1px dashed var(--tui-border-muted);
  flex-shrink: 0;
}

.plan-tab {
  display: flex;
  align-items: center;
  gap: var(--tui-space-1);
  padding: var(--tui-space-1) var(--tui-space-2);
  font-size: var(--tui-font-size-xs);
  font-family: var(--tui-font-mono);
  background: transparent;
  border: 1px solid var(--tui-border-muted);
  color: var(--tui-text-secondary);
  cursor: pointer;
  transition: all var(--tui-duration-fast);
}

.plan-tab:hover {
  border-color: var(--tui-theme-primary-dim);
  color: var(--tui-text-primary);
}

.plan-tab.active {
  border-color: var(--tui-theme-primary);
  color: var(--tui-theme-primary);
  background: var(--tui-bg-elevated);
}

.tab-status {
  font-size: var(--tui-font-size-xs);
}

.tab-status.in_progress {
  color: var(--tui-info);
}

.tab-status.completed {
  color: var(--tui-success);
}

.tab-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Single plan display */
.single-plan {
  display: flex;
  align-items: center;
  gap: var(--tui-space-2);
  padding: var(--tui-space-2) var(--tui-space-3);
  background: var(--tui-bg-surface);
  border-bottom: 1px dashed var(--tui-border-muted);
  flex-shrink: 0;
}

.single-plan-status {
  font-size: var(--tui-font-size-xs);
}

.single-plan-status.in_progress {
  color: var(--tui-info);
}

.single-plan-status.completed {
  color: var(--tui-success);
}

.single-plan-name {
  font-size: var(--tui-font-size-sm);
  font-weight: var(--tui-font-weight-medium);
  color: var(--tui-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Content area */
.plan-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--tui-space-3);
  min-height: 0;
}

.content-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--tui-space-8);
}

.content-markdown {
  min-height: 100%;
}

.content-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--tui-space-2);
  padding: var(--tui-space-8);
  color: var(--tui-text-muted);
  text-align: center;
}

.empty-icon {
  font-size: var(--tui-font-size-lg);
  color: var(--tui-text-secondary);
}

/* Footer */
.panel-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--tui-space-4);
  padding: var(--tui-space-2) var(--tui-space-3);
  background: var(--tui-bg-elevated);
  border-top: 1px solid var(--tui-border-muted);
  flex-shrink: 0;
}

.hint {
  font-size: var(--tui-font-size-xs);
  color: var(--tui-text-muted);
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .tab-name {
    max-width: 80px;
  }

  .panel-footer {
    flex-direction: column;
    gap: var(--tui-space-1);
  }
}
</style>
