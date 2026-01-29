<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { TuiWindow } from './tui';

const props = withDefaults(defineProps<{
  title: string;
  maxLines?: number;
}>(), {
  maxLines: 4
});

const titleRef = ref<HTMLElement | null>(null);
const isExpandable = ref(false);
const showModal = ref(false);

function checkOverflow() {
  if (!titleRef.value) return;
  const el = titleRef.value;
  isExpandable.value = el.scrollHeight > el.clientHeight;
}

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  checkOverflow();
  resizeObserver = new ResizeObserver(checkOverflow);
  if (titleRef.value) {
    resizeObserver.observe(titleRef.value);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  window.removeEventListener('keydown', handleKeydown);
});

watch(() => props.title, () => {
  nextTick(checkOverflow);
});

watch(showModal, (open) => {
  if (open) {
    window.addEventListener('keydown', handleKeydown);
  } else {
    window.removeEventListener('keydown', handleKeydown);
  }
});

function handleClick() {
  if (isExpandable.value) {
    showModal.value = true;
  }
}

function closeModal() {
  showModal.value = false;
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && showModal.value) {
    e.preventDefault();
    closeModal();
  }
}
</script>

<template>
  <div class="expandable-title" :class="{ 'is-expandable': isExpandable }">
    <!-- Clamped title display -->
    <div
      ref="titleRef"
      class="title-text"
      :style="{ maxHeight: `calc(${maxLines} * 1.4em)` }"
      @click="handleClick"
    >
      {{ title }}
    </div>

    <!-- Expand indicator -->
    <button
      v-if="isExpandable"
      class="expand-button"
      @click="handleClick"
      aria-label="Show full message"
    >
      [more...]
    </button>
  </div>

  <!-- Full message modal -->
  <Teleport to="body">
    <Transition name="title-modal">
      <div
        v-if="showModal"
        class="title-modal-overlay"
        @click.self="closeModal"
        tabindex="-1"
      >
        <div class="title-modal-container">
          <TuiWindow title="Full Message" :show-controls="false">
            <div class="title-modal-content">
              {{ title }}
            </div>
            <div class="modal-footer">
              <button class="close-button" @click="closeModal">
                [Close] <kbd>Esc</kbd>
              </button>
            </div>
          </TuiWindow>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.expandable-title {
  display: flex;
  flex-direction: column;
  gap: var(--tui-space-2);
}

.title-text {
  overflow: hidden;
  word-wrap: break-word;
  white-space: pre-wrap;
  font-size: var(--tui-font-size-lg);
  font-weight: var(--tui-font-weight-semibold);
  color: var(--tui-theme-primary-bright);
  line-height: 1.4;
}

.is-expandable .title-text {
  cursor: pointer;
}

.is-expandable .title-text:hover {
  text-decoration: underline;
  text-decoration-style: dotted;
}

.expand-button {
  align-self: flex-start;
  background: var(--tui-bg-elevated);
  border: 1px solid var(--tui-theme-primary);
  color: var(--tui-theme-primary-bright);
  cursor: pointer;
  font-family: var(--tui-font-mono);
  font-size: var(--tui-font-size-base);
  font-weight: var(--tui-font-weight-semibold);
  padding: var(--tui-space-2) var(--tui-space-4);
  margin-top: var(--tui-space-2);
  transition: all 150ms ease;
}

.expand-button:hover {
  background: var(--tui-theme-primary);
  color: var(--tui-bg-base);
  box-shadow: 0 0 8px var(--tui-theme-primary-glow);
}

.expand-button:active {
  transform: scale(0.98);
}

/* Modal styles */
.title-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--tui-space-4);
}

.title-modal-container {
  max-width: 700px;
  width: 100%;
  max-height: 80vh;
}

.title-modal-content {
  max-height: 60vh;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  padding: var(--tui-space-2);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--tui-space-4);
  border-top: 1px solid var(--tui-border-muted);
  margin-top: var(--tui-space-4);
}

.close-button {
  background: none;
  border: 1px solid var(--tui-border-muted);
  color: var(--tui-text-secondary);
  cursor: pointer;
  font-family: var(--tui-font-mono);
  font-size: var(--tui-font-size-sm);
  padding: var(--tui-space-1) var(--tui-space-3);
}

.close-button:hover {
  border-color: var(--tui-theme-primary);
  color: var(--tui-theme-primary);
}

.close-button kbd {
  margin-left: var(--tui-space-2);
  font-size: var(--tui-font-size-xs);
  color: var(--tui-text-muted);
}

/* Modal transitions */
.title-modal-enter-active,
.title-modal-leave-active {
  transition: opacity 200ms ease;
}

.title-modal-enter-active .title-modal-container,
.title-modal-leave-active .title-modal-container {
  transition: transform 200ms ease;
}

.title-modal-enter-from,
.title-modal-leave-to {
  opacity: 0;
}

.title-modal-enter-from .title-modal-container,
.title-modal-leave-to .title-modal-container {
  transform: scale(0.95);
}
</style>
