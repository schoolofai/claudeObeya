<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';

interface Props {
  storageKey: string;
  defaultLeftWidth: number;
  minLeftWidth: number;
  maxLeftWidth: number;
  collapseThreshold?: number;
  collapsedWidth?: number;
}

const props = withDefaults(defineProps<Props>(), {
  collapseThreshold: 100,
  collapsedWidth: 48,
});

const emit = defineEmits<{
  collapse: [collapsed: boolean];
  resize: [width: number];
}>();

// State
const leftWidth = ref(props.defaultLeftWidth);
const isCollapsed = ref(false);
const isDragging = ref(false);
const previousWidth = ref(props.defaultLeftWidth);

// Computed effective width
const effectiveWidth = computed(() =>
  isCollapsed.value ? props.collapsedWidth : leftWidth.value
);

// Load saved state from localStorage
function loadFromStorage() {
  try {
    const saved = localStorage.getItem(props.storageKey);
    if (saved) {
      const data = JSON.parse(saved);
      if (typeof data.width === 'number') {
        leftWidth.value = Math.max(props.minLeftWidth, Math.min(props.maxLeftWidth, data.width));
        previousWidth.value = leftWidth.value;
      }
      if (typeof data.collapsed === 'boolean') {
        isCollapsed.value = data.collapsed;
      }
    }
  } catch (e) {
    console.error('[ResizableSplitPanel] Failed to load from localStorage:', e);
  }
}

// Save state to localStorage
function saveToStorage() {
  try {
    localStorage.setItem(props.storageKey, JSON.stringify({
      width: leftWidth.value,
      collapsed: isCollapsed.value,
    }));
  } catch (e) {
    console.error('[ResizableSplitPanel] Failed to save to localStorage:', e);
  }
}

// Resize logic
function startResize(event: PointerEvent) {
  event.preventDefault();
  isDragging.value = true;

  const startX = event.clientX;
  const startWidth = isCollapsed.value ? props.collapsedWidth : leftWidth.value;

  function onMove(e: PointerEvent) {
    const delta = e.clientX - startX;
    let newWidth = startWidth + delta;

    // Auto-collapse if below threshold
    if (newWidth < props.collapseThreshold) {
      if (!isCollapsed.value) {
        previousWidth.value = leftWidth.value;
        isCollapsed.value = true;
        emit('collapse', true);
      }
    } else {
      // Clamp to min/max
      newWidth = Math.max(props.minLeftWidth, Math.min(props.maxLeftWidth, newWidth));

      if (isCollapsed.value) {
        isCollapsed.value = false;
        emit('collapse', false);
      }
      leftWidth.value = newWidth;
      emit('resize', newWidth);
    }
  }

  function onUp() {
    isDragging.value = false;
    saveToStorage();
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
  }

  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
}

// Toggle collapse on double-click
function toggleCollapse() {
  if (isCollapsed.value) {
    isCollapsed.value = false;
    leftWidth.value = previousWidth.value || props.defaultLeftWidth;
    emit('collapse', false);
  } else {
    previousWidth.value = leftWidth.value;
    isCollapsed.value = true;
    emit('collapse', true);
  }
  saveToStorage();
}

// Keyboard support for accessibility
function handleKeyboard(event: KeyboardEvent) {
  const step = event.shiftKey ? 100 : 20;

  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault();
      if (!isCollapsed.value) {
        const newWidth = Math.max(props.minLeftWidth, leftWidth.value - step);
        if (newWidth < props.collapseThreshold) {
          previousWidth.value = leftWidth.value;
          isCollapsed.value = true;
          emit('collapse', true);
        } else {
          leftWidth.value = newWidth;
          emit('resize', newWidth);
        }
        saveToStorage();
      }
      break;

    case 'ArrowRight':
      event.preventDefault();
      if (isCollapsed.value) {
        isCollapsed.value = false;
        leftWidth.value = previousWidth.value || props.defaultLeftWidth;
        emit('collapse', false);
      } else {
        leftWidth.value = Math.min(props.maxLeftWidth, leftWidth.value + step);
        emit('resize', leftWidth.value);
      }
      saveToStorage();
      break;

    case 'Home':
      event.preventDefault();
      if (!isCollapsed.value) {
        leftWidth.value = props.minLeftWidth;
        emit('resize', leftWidth.value);
        saveToStorage();
      }
      break;

    case 'End':
      event.preventDefault();
      if (isCollapsed.value) {
        isCollapsed.value = false;
        emit('collapse', false);
      }
      leftWidth.value = props.maxLeftWidth;
      emit('resize', leftWidth.value);
      saveToStorage();
      break;

    case 'Enter':
    case ' ':
      event.preventDefault();
      toggleCollapse();
      break;
  }
}

// ARIA attributes for accessibility
const ariaValueNow = computed(() => isCollapsed.value ? 0 : leftWidth.value);
const ariaValueMin = computed(() => props.minLeftWidth);
const ariaValueMax = computed(() => props.maxLeftWidth);

// Watch for external collapse changes
watch(isCollapsed, (collapsed) => {
  if (collapsed && leftWidth.value > props.collapseThreshold) {
    previousWidth.value = leftWidth.value;
  }
});

onMounted(() => {
  loadFromStorage();
});

// Expose methods for parent control
defineExpose({
  toggleCollapse,
  isCollapsed,
});
</script>

<template>
  <div
    class="split-panel"
    :class="{
      'split-panel--dragging': isDragging,
      'split-panel--collapsed': isCollapsed
    }"
  >
    <!-- Left panel (plans) -->
    <div
      class="split-panel__left"
      :style="{ width: effectiveWidth + 'px' }"
    >
      <slot name="left" :collapsed="isCollapsed" />

      <!-- Collapsed state indicator -->
      <div v-if="isCollapsed" class="collapsed-indicator">
        <span class="collapsed-arrow">▶</span>
        <span class="collapsed-label">P<br/>L<br/>A<br/>N<br/>S</span>
      </div>
    </div>

    <!-- Draggable divider -->
    <div
      class="split-panel__divider"
      role="separator"
      tabindex="0"
      :aria-valuenow="ariaValueNow"
      :aria-valuemin="ariaValueMin"
      :aria-valuemax="ariaValueMax"
      aria-label="Resize panels"
      @pointerdown="startResize"
      @dblclick="toggleCollapse"
      @keydown="handleKeyboard"
    >
      <span class="divider-handle">┃</span>
    </div>

    <!-- Right panel (tasks) -->
    <div class="split-panel__right">
      <slot name="right" />
    </div>
  </div>
</template>

<style scoped>
.split-panel {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.split-panel--dragging {
  cursor: col-resize;
  user-select: none;
}

.split-panel--dragging * {
  pointer-events: none;
}

.split-panel--dragging .split-panel__divider {
  pointer-events: auto;
}

/* Left panel */
.split-panel__left {
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
  transition: width 0.15s ease;
  background: var(--tui-bg-surface);
}

.split-panel--dragging .split-panel__left {
  transition: none;
}

.split-panel--collapsed .split-panel__left {
  overflow: visible;
}

/* Collapsed state indicator */
.collapsed-indicator {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: var(--tui-space-4);
  gap: var(--tui-space-2);
  cursor: pointer;
  background: var(--tui-bg-elevated);
}

.collapsed-arrow {
  color: var(--tui-theme-primary);
  font-size: var(--tui-font-size-sm);
}

.collapsed-label {
  font-family: var(--tui-font-mono);
  font-size: var(--tui-font-size-xs);
  font-weight: var(--tui-font-weight-medium);
  letter-spacing: var(--tui-letter-spacing-wider);
  color: var(--tui-text-secondary);
  text-align: center;
  line-height: 1.4;
}

/* Draggable divider */
.split-panel__divider {
  width: 8px;
  flex-shrink: 0;
  cursor: col-resize;
  background: var(--tui-bg-surface);
  border-left: 1px solid var(--tui-border-muted);
  border-right: 1px solid var(--tui-border-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
  transition: all var(--tui-duration-fast);
}

.split-panel__divider:hover {
  background: var(--tui-bg-elevated);
  border-color: var(--tui-theme-primary);
}

.split-panel__divider:focus {
  outline: none;
  background: var(--tui-bg-elevated);
  border-color: var(--tui-theme-primary);
  box-shadow: 0 0 0 1px var(--tui-theme-primary);
}

.divider-handle {
  font-family: var(--tui-font-mono);
  font-size: var(--tui-font-size-sm);
  color: var(--tui-text-muted);
  transition: color var(--tui-duration-fast);
}

.split-panel__divider:hover .divider-handle,
.split-panel__divider:focus .divider-handle {
  color: var(--tui-theme-primary);
}

/* Right panel */
.split-panel__right {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

/* Reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .split-panel__left {
    transition: none;
  }

  .split-panel__divider,
  .divider-handle {
    transition: none;
  }
}

/* Mobile: stack vertically */
@media (max-width: 768px) {
  .split-panel {
    flex-direction: column;
  }

  .split-panel__left {
    width: 100% !important;
    height: auto;
    max-height: 300px;
  }

  .split-panel__divider {
    width: 100%;
    height: 8px;
    cursor: row-resize;
    border-left: none;
    border-right: none;
    border-top: 1px solid var(--tui-border-muted);
    border-bottom: 1px solid var(--tui-border-muted);
  }

  .divider-handle {
    transform: rotate(90deg);
  }

  .collapsed-indicator {
    flex-direction: row;
    justify-content: center;
    padding-top: 0;
    padding: var(--tui-space-2);
  }

  .collapsed-label {
    writing-mode: horizontal-tb;
  }
}
</style>
