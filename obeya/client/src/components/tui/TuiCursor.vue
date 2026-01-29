<script setup lang="ts">
type CursorVariant = 'block' | 'underline' | 'bar';

withDefaults(defineProps<{
  variant?: CursorVariant;
  blink?: boolean;
}>(), {
  variant: 'block',
  blink: true
});
</script>

<template>
  <span
    class="tui-cursor"
    :class="[
      `tui-cursor--${variant}`,
      { 'tui-cursor--blink': blink }
    ]"
  >
    <template v-if="variant === 'block'">█</template>
    <template v-else-if="variant === 'underline'">_</template>
    <template v-else>│</template>
  </span>
</template>

<style scoped>
.tui-cursor {
  display: inline;
  color: var(--tui-theme-primary);
}

.tui-cursor--blink {
  animation: tui-blink var(--tui-blink-speed) step-end infinite;
}

.tui-cursor--block {
  background: var(--tui-theme-primary);
  color: var(--tui-bg-base);
}

.tui-cursor--underline {
  text-decoration: none;
}

.tui-cursor--bar {
  font-weight: var(--tui-font-weight-normal);
}

@media (prefers-reduced-motion: reduce) {
  .tui-cursor--blink {
    animation: none;
    opacity: 1;
  }
}
</style>
