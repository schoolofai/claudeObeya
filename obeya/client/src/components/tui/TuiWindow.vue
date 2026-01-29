<script setup lang="ts">
import { computed } from 'vue';

type WindowVariant = 'single' | 'double';

const props = withDefaults(defineProps<{
  title?: string;
  variant?: WindowVariant;
  showControls?: boolean;
  glow?: boolean;
}>(), {
  title: 'Terminal',
  variant: 'single',
  showControls: true,
  glow: false
});

defineEmits<{
  minimize: [];
  maximize: [];
  close: [];
}>();

const boxChars = computed(() => {
  if (props.variant === 'double') {
    return { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║', tee: '╤', cross: '╪' };
  }
  return { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│', tee: '┬', cross: '┼' };
});
</script>

<template>
  <div class="tui-window" :class="[`tui-window--${variant}`, { 'tui-window--glow': glow }]">
    <!-- Title bar -->
    <div class="tui-window__titlebar">
      <span class="tui-window__corner">{{ boxChars.tl }}</span>
      <span class="tui-window__line">{{ boxChars.h }}</span>
      <span class="tui-window__title">[ {{ title }} ]</span>
      <span class="tui-window__line tui-window__line--flex">{{ boxChars.h }}</span>
      <template v-if="showControls">
        <span class="tui-window__control" @click="$emit('minimize')" title="Minimize">[_]</span>
        <span class="tui-window__control" @click="$emit('maximize')" title="Maximize">[□]</span>
        <span class="tui-window__control tui-window__control--close" @click="$emit('close')" title="Close">[×]</span>
      </template>
      <span class="tui-window__corner">{{ boxChars.tr }}</span>
    </div>

    <!-- Content area -->
    <div class="tui-window__body">
      <span class="tui-window__side">{{ boxChars.v }}</span>
      <div class="tui-window__content">
        <slot></slot>
      </div>
      <span class="tui-window__side">{{ boxChars.v }}</span>
    </div>

    <!-- Bottom border -->
    <div class="tui-window__footer">
      <span class="tui-window__corner">{{ boxChars.bl }}</span>
      <span class="tui-window__line tui-window__line--full">{{ boxChars.h }}</span>
      <span class="tui-window__corner">{{ boxChars.br }}</span>
    </div>
  </div>
</template>

<style scoped>
.tui-window {
  display: flex;
  flex-direction: column;
  font-family: var(--tui-font-mono);
  color: var(--tui-text-primary);
  background: var(--tui-bg-base);
}

.tui-window--glow {
  text-shadow:
    0 0 2px var(--tui-theme-primary-glow),
    0 0 4px var(--tui-theme-primary-glow);
}

.tui-window__titlebar {
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
}

.tui-window__corner {
  flex-shrink: 0;
}

.tui-window__line {
  overflow: hidden;
  position: relative;
  min-width: 2ch;
}

.tui-window__line::after {
  content: "────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────";
  position: absolute;
  left: 0;
  top: 0;
}

.tui-window--double .tui-window__line::after {
  content: "════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════";
}

.tui-window__line--flex {
  flex: 1;
}

.tui-window__line--full {
  flex: 1;
}

.tui-window__title {
  flex-shrink: 0;
  padding: 0 var(--tui-space-1);
  color: var(--tui-theme-primary-bright);
  font-weight: var(--tui-font-weight-semibold);
  letter-spacing: var(--tui-letter-spacing-wide);
}

.tui-window__control {
  flex-shrink: 0;
  cursor: pointer;
  padding: 0 2px;
  color: var(--tui-text-muted);
  transition: color var(--tui-duration-fast);
}

.tui-window__control:hover {
  color: var(--tui-theme-primary);
}

.tui-window__control--close:hover {
  color: var(--tui-error);
}

.tui-window__body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.tui-window__side {
  flex-shrink: 0;
}

.tui-window__content {
  flex: 1;
  padding: var(--tui-space-2) var(--tui-space-3);
  min-width: 0;
  overflow: auto;
}

.tui-window__footer {
  display: flex;
  white-space: nowrap;
  overflow: hidden;
}
</style>
