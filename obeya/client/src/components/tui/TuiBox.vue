<script setup lang="ts">
import { computed } from 'vue';

type BoxVariant = 'single' | 'double' | 'rounded' | 'ascii';

const props = withDefaults(defineProps<{
  variant?: BoxVariant;
  title?: string;
  glow?: boolean;
}>(), {
  variant: 'single',
  glow: false
});

const boxChars = computed(() => {
  switch (props.variant) {
    case 'double':
      return { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' };
    case 'rounded':
      return { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' };
    case 'ascii':
      return { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' };
    default:
      return { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' };
  }
});
</script>

<template>
  <div class="tui-box" :class="[`tui-box--${variant}`, { 'tui-box--glow': glow }]">
    <div class="tui-box__border tui-box__border--top">
      <span class="tui-box__corner">{{ boxChars.tl }}</span>
      <span v-if="title" class="tui-box__title">{{ boxChars.h }} {{ title }} </span>
      <span class="tui-box__line">{{ boxChars.h }}</span>
      <span class="tui-box__corner">{{ boxChars.tr }}</span>
    </div>
    <div class="tui-box__content">
      <span class="tui-box__side">{{ boxChars.v }}</span>
      <div class="tui-box__inner">
        <slot></slot>
      </div>
      <span class="tui-box__side">{{ boxChars.v }}</span>
    </div>
    <div class="tui-box__border tui-box__border--bottom">
      <span class="tui-box__corner">{{ boxChars.bl }}</span>
      <span class="tui-box__line">{{ boxChars.h }}</span>
      <span class="tui-box__corner">{{ boxChars.br }}</span>
    </div>
  </div>
</template>

<style scoped>
.tui-box {
  display: flex;
  flex-direction: column;
  color: var(--tui-text-primary);
  background: var(--tui-bg-surface);
}

.tui-box--glow {
  text-shadow:
    0 0 2px var(--tui-theme-primary-glow),
    0 0 4px var(--tui-theme-primary-glow);
}

.tui-box__border {
  display: flex;
  white-space: nowrap;
  overflow: hidden;
}

.tui-box__border--top {
  margin-bottom: -1px;
}

.tui-box__border--bottom {
  margin-top: -1px;
}

.tui-box__corner {
  flex-shrink: 0;
}

.tui-box__title {
  flex-shrink: 0;
  padding: 0 var(--tui-space-1);
  color: var(--tui-theme-primary-bright);
  font-weight: var(--tui-font-weight-semibold);
}

.tui-box__line {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.tui-box__line::after {
  content: "────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────";
  position: absolute;
  left: 0;
  top: 0;
}

.tui-box--double .tui-box__line::after {
  content: "════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════";
}

.tui-box--ascii .tui-box__line::after {
  content: "----------------------------------------------------------------------------------------------------------------------------------------";
}

.tui-box__content {
  display: flex;
  min-height: var(--tui-space-8);
}

.tui-box__side {
  flex-shrink: 0;
}

.tui-box__inner {
  flex: 1;
  padding: var(--tui-space-2) var(--tui-space-3);
  min-width: 0;
}
</style>
