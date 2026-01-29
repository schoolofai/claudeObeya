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
    throw e;
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
    <Transition name="plan-modal">
      <div
        v-if="visible"
        class="modal-overlay"
        @click.self="emit('close')"
        role="dialog"
        aria-modal="true"
      >
        <div class="modal-container">
          <TuiWindow
            :title="`PLAN: ${plan?.plan_name || 'Unknown'}`"
            variant="double"
            :glow="true"
            :show-controls="false"
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

          <div class="modal-footer">
            Press <kbd>Esc</kbd> to close
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--tui-space-4);
}

.modal-container {
  width: 100%;
  max-width: 900px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.modal-container :deep(.tui-window) {
  flex: 1;
  max-height: calc(85vh - 3rem);
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
  overflow-y: auto;
  padding: var(--tui-space-4);
}

.modal-content {
  min-height: 200px;
}

.modal-footer {
  flex-shrink: 0;
  padding: var(--tui-space-2) var(--tui-space-3);
  font-size: var(--tui-font-size-xs);
  color: var(--tui-text-muted);
  text-align: center;
  background: var(--tui-bg-elevated);
  border-top: 1px solid var(--tui-border-muted);
}

.modal-footer kbd {
  display: inline-block;
  padding: 0 var(--tui-space-1);
  background: var(--tui-bg-surface);
  border: 1px solid var(--tui-border-muted);
  border-radius: 2px;
  font-size: var(--tui-font-size-xs);
  color: var(--tui-theme-primary);
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

/* Transition */
.plan-modal-enter-active,
.plan-modal-leave-active {
  transition: opacity 200ms ease;
}

.plan-modal-enter-active .modal-container,
.plan-modal-leave-active .modal-container {
  transition: transform 200ms ease;
}

.plan-modal-enter-from,
.plan-modal-leave-to {
  opacity: 0;
}

.plan-modal-enter-from .modal-container,
.plan-modal-leave-to .modal-container {
  transform: scale(0.95);
}

/* Reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .plan-modal-enter-active,
  .plan-modal-leave-active,
  .plan-modal-enter-active .modal-container,
  .plan-modal-leave-active .modal-container {
    transition: none;
  }
}
</style>
