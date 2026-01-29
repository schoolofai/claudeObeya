<script setup lang="ts">
import { computed } from 'vue';

type ProgressVariant = 'block' | 'ascii' | 'hash' | 'dots';

const props = withDefaults(defineProps<{
  percent: number;
  width?: number;
  variant?: ProgressVariant;
  showPercent?: boolean;
  glow?: boolean;
}>(), {
  width: 20,
  variant: 'block',
  showPercent: true,
  glow: false
});

const progressChars = computed(() => {
  switch (props.variant) {
    case 'ascii':
      return { filled: '=', empty: '-', cap: '>' };
    case 'hash':
      return { filled: '#', empty: '.', cap: '#' };
    case 'dots':
      return { filled: '●', empty: '○', cap: '●' };
    default:
      return { filled: '█', empty: '░', cap: '█' };
  }
});

const clampedPercent = computed(() => Math.max(0, Math.min(100, props.percent)));

const filledCount = computed(() => Math.round((clampedPercent.value / 100) * props.width));

const filledBar = computed(() => {
  const chars = progressChars.value;
  const filled = filledCount.value;
  if (filled === 0) return '';
  if (filled === props.width) return chars.filled.repeat(props.width);
  return chars.filled.repeat(filled - 1) + chars.cap;
});

const emptyBar = computed(() => {
  const chars = progressChars.value;
  const empty = props.width - filledCount.value;
  return chars.empty.repeat(empty);
});

const barColor = computed(() => {
  if (clampedPercent.value >= 80) return 'var(--tui-success)';
  if (clampedPercent.value >= 50) return 'var(--tui-warning)';
  return 'var(--tui-theme-primary)';
});

const glowColor = computed(() => {
  if (clampedPercent.value >= 80) return 'var(--tui-green-glow)';
  if (clampedPercent.value >= 50) return 'var(--tui-amber-glow)';
  return 'var(--tui-theme-primary-glow)';
});
</script>

<template>
  <span
    class="tui-progress"
    :class="{ 'tui-progress--glow': glow }"
    :style="{ '--bar-color': barColor, '--bar-glow': glowColor }"
  >
    <span class="tui-progress__bracket">[</span>
    <span class="tui-progress__filled">{{ filledBar }}</span>
    <span class="tui-progress__empty">{{ emptyBar }}</span>
    <span class="tui-progress__bracket">]</span>
    <span v-if="showPercent" class="tui-progress__percent">{{ Math.round(clampedPercent) }}%</span>
  </span>
</template>

<style scoped>
.tui-progress {
  display: inline-flex;
  align-items: center;
  gap: var(--tui-space-2);
  font-family: var(--tui-font-mono);
  font-size: var(--tui-font-size-sm);
}

.tui-progress__bracket {
  color: var(--tui-text-muted);
}

.tui-progress__filled {
  color: var(--bar-color);
}

.tui-progress--glow .tui-progress__filled {
  text-shadow:
    0 0 2px var(--bar-glow),
    0 0 4px var(--bar-glow);
}

.tui-progress__empty {
  color: var(--tui-border-muted);
}

.tui-progress__percent {
  min-width: 4ch;
  text-align: right;
  color: var(--tui-text-secondary);
}
</style>
