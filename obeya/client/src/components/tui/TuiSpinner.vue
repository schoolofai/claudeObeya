<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';

type SpinnerVariant = 'braille' | 'line' | 'box' | 'dots' | 'arrow' | 'bounce';

const props = withDefaults(defineProps<{
  variant?: SpinnerVariant;
  speed?: number;
  glow?: boolean;
}>(), {
  variant: 'braille',
  speed: 80,
  glow: false
});

const spinnerFrames: Record<SpinnerVariant, string[]> = {
  braille: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  line: ['|', '/', '-', '\\'],
  box: ['◰', '◳', '◲', '◱'],
  dots: ['⠁', '⠂', '⠄', '⡀', '⢀', '⠠', '⠐', '⠈'],
  arrow: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
  bounce: ['⠁', '⠂', '⠄', '⠂']
};

const frameIndex = ref(0);
let intervalId: number | null = null;

const frames = computed(() => spinnerFrames[props.variant]);
const currentFrame = computed(() => frames.value[frameIndex.value % frames.value.length]);

onMounted(() => {
  intervalId = window.setInterval(() => {
    frameIndex.value = (frameIndex.value + 1) % frames.value.length;
  }, props.speed);
});

onUnmounted(() => {
  if (intervalId !== null) {
    clearInterval(intervalId);
  }
});
</script>

<template>
  <span
    class="tui-spinner"
    :class="{ 'tui-spinner--glow': glow }"
    role="status"
    aria-label="Loading"
  >
    {{ currentFrame }}
    <span v-if="$slots.default" class="tui-spinner__text"><slot></slot></span>
  </span>
</template>

<style scoped>
.tui-spinner {
  display: inline-flex;
  align-items: center;
  gap: var(--tui-space-2);
  font-family: var(--tui-font-mono);
  color: var(--tui-theme-primary);
}

.tui-spinner--glow {
  text-shadow:
    0 0 2px var(--tui-theme-primary-glow),
    0 0 4px var(--tui-theme-primary-glow);
}

.tui-spinner__text {
  color: var(--tui-text-secondary);
}

@media (prefers-reduced-motion: reduce) {
  .tui-spinner::before {
    content: "...";
    animation: none;
  }
}
</style>
