<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { TuiWindow, TuiSpinner, TuiMarkdown, TuiBadge } from '../components/tui';

const route = useRoute();

const planId = computed(() => route.params.planId as string);

const plan = ref<{ id: number; plan_name: string; status: string; plan_content: string } | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

async function fetchPlan() {
  loading.value = true;
  error.value = null;

  try {
    const res = await fetch(`/api/plans/${planId.value}/content`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to fetch plan`);
    }
    const data = await res.json();
    plan.value = data.plan;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load plan';
    throw e;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchPlan();
});
</script>

<template>
  <div class="plan-detail">
    <!-- Loading state -->
    <div v-if="loading" class="loading-state">
      <TuiSpinner variant="braille" :speed="80" :glow="true">
        Loading plan...
      </TuiSpinner>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="error-state">
      <span class="error-icon">[✗]</span>
      <span class="error-text">ERROR: {{ error }}</span>
    </div>

    <!-- Plan content -->
    <template v-else-if="plan">
      <TuiWindow
        :title="plan.plan_name"
        variant="double"
        :glow="true"
        :show-controls="false"
      >
        <div class="plan-header">
          <TuiBadge
            :variant="plan.status === 'in_progress' ? 'info' : 'success'"
            :icon="plan.status === 'in_progress' ? '▶' : '✓'"
          >
            {{ plan.status === 'in_progress' ? 'IN PROGRESS' : 'COMPLETED' }}
          </TuiBadge>
          <span class="plan-id">Plan #{{ plan.id }}</span>
        </div>

        <div class="plan-content">
          <TuiMarkdown v-if="plan.plan_content" :content="plan.plan_content" />
          <div v-else class="empty-state">
            [i] No plan content available
          </div>
        </div>
      </TuiWindow>
    </template>
  </div>
</template>

<style scoped>
.plan-detail {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--tui-space-4);
  min-height: 100vh;
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

.plan-header {
  display: flex;
  align-items: center;
  gap: var(--tui-space-4);
  padding-bottom: var(--tui-space-4);
  border-bottom: 1px dashed var(--tui-border-muted);
  margin-bottom: var(--tui-space-4);
}

.plan-id {
  font-size: var(--tui-font-size-xs);
  color: var(--tui-text-muted);
  font-family: var(--tui-font-mono);
}

.plan-content {
  padding: var(--tui-space-2);
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--tui-space-8);
  color: var(--tui-text-muted);
}
</style>
