<script setup lang="ts">
import { computed } from 'vue';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default' | 'muted';

const props = withDefaults(defineProps<{
  variant?: BadgeVariant;
  icon?: string;
  glow?: boolean;
}>(), {
  variant: 'default',
  glow: false
});

const badgeIcon = computed(() => {
  if (props.icon) return props.icon;
  switch (props.variant) {
    case 'success': return '✓';
    case 'warning': return '!';
    case 'error': return '✗';
    case 'info': return 'i';
    default: return '•';
  }
});

const badgeColor = computed(() => {
  switch (props.variant) {
    case 'success': return 'var(--tui-success)';
    case 'warning': return 'var(--tui-warning)';
    case 'error': return 'var(--tui-error)';
    case 'info': return 'var(--tui-info)';
    case 'muted': return 'var(--tui-text-muted)';
    default: return 'var(--tui-text-primary)';
  }
});

const glowColor = computed(() => {
  switch (props.variant) {
    case 'success': return 'var(--tui-green-glow)';
    case 'warning': return 'var(--tui-amber-glow)';
    case 'error': return 'var(--tui-red-glow)';
    case 'info': return 'var(--tui-cyan-glow)';
    default: return 'var(--tui-theme-primary-glow)';
  }
});
</script>

<template>
  <span
    class="tui-badge"
    :class="[`tui-badge--${variant}`, { 'tui-badge--glow': glow }]"
    :style="{
      '--badge-color': badgeColor,
      '--badge-glow': glowColor
    }"
  >
    <span class="tui-badge__bracket">[</span>
    <span class="tui-badge__icon">{{ badgeIcon }}</span>
    <span v-if="$slots.default" class="tui-badge__text"><slot></slot></span>
    <span class="tui-badge__bracket">]</span>
  </span>
</template>

<style scoped>
.tui-badge {
  display: inline-flex;
  align-items: center;
  font-family: var(--tui-font-mono);
  font-size: var(--tui-font-size-sm);
  color: var(--badge-color);
  white-space: nowrap;
}

.tui-badge--glow {
  text-shadow:
    0 0 2px var(--badge-glow),
    0 0 4px var(--badge-glow);
}

.tui-badge__bracket {
  color: var(--tui-text-muted);
}

.tui-badge__icon {
  font-weight: var(--tui-font-weight-bold);
}

.tui-badge__text {
  margin-left: var(--tui-space-1);
}

/* Variant-specific styles */
.tui-badge--success {
  color: var(--tui-success);
}

.tui-badge--warning {
  color: var(--tui-warning);
}

.tui-badge--error {
  color: var(--tui-error);
}

.tui-badge--info {
  color: var(--tui-info);
}

.tui-badge--muted {
  color: var(--tui-text-muted);
}

.tui-badge--muted .tui-badge__bracket {
  color: var(--tui-text-muted);
}
</style>
