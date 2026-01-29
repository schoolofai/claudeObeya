<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import type { Plan } from '../composables/useProjects';
import { TuiWindow, TuiMarkdown, TuiSpinner } from './tui';

const props = defineProps<{
  plan: Plan | null;
  visible: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const loading = ref(false);
const content = ref('');
const error = ref<string | null>(null);

watch(
  () => [props.visible, props.plan?.id],
  async ([visible, planId]) => {
    if (visible && planId) {
      await fetchPlanContent(planId as number);
    }
  },
  { immediate: true }
);

async function fetchPlanContent(planId: number) {
  loading.value = true;
  error.value = null;

  try {
    const res = await fetch(`/api/plans/${planId}/content`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to fetch plan content`);
    }
    const data = await res.json();
    content.value = data.plan.plan_content || '';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load plan content';
    throw e; // Fast fail per user preference
  } finally {
    loading.value = false;
  }
}

function handlePlanUpdate(event: Event) {
  const customEvent = event as CustomEvent;
  if (
    customEvent.detail?.type === 'plan_content_updated' &&
    customEvent.detail?.planId === props.plan?.id
  ) {
    content.value = customEvent.detail.content;
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.visible) {
    emit('close');
  }
}

onMounted(() => {
  window.addEventListener('obeya-event', handlePlanUpdate as EventListener);
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('obeya-event', handlePlanUpdate as EventListener);
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="modal-overlay"
      @click.self="emit('close')"
    >
      <div class="modal-container">
        <TuiWindow
          :title="`PLAN: ${plan?.plan_name || 'Unknown'}`"
          variant="double"
          :glow="true"
          @close="emit('close')"
        >
          <div class="modal-content">
            <div v-if="loading" class="loading-state">
              <TuiSpinner variant="braille" :speed="80">Loading plan content...</TuiSpinner>
            </div>

            <div v-else-if="error" class="error-state">
              <span class="error-icon">[!]</span>
              <span class="error-message">{{ error }}</span>
            </div>

            <div v-else-if="!content" class="empty-state">
              [i] No plan content available
            </div>

            <TuiMarkdown v-else :content="content" />
          </div>
        </TuiWindow>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--tui-space-4);
  overflow: hidden;
}

.modal-container {
  width: 100%;
  max-width: 900px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-container :deep(.tui-window) {
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-container :deep(.tui-window__body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.modal-container :deep(.tui-window__content) {
  height: 100%;
  max-height: calc(85vh - 4rem);
  overflow-y: auto;
  padding: var(--tui-space-4);
}

.modal-content {
  min-height: 200px;
}

.loading-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--tui-text-muted);
}

.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--tui-space-2);
  min-height: 200px;
  color: var(--tui-error);
}

.error-icon {
  font-weight: var(--tui-font-weight-bold);
}

.error-message {
  color: var(--tui-text-secondary);
}
</style>
