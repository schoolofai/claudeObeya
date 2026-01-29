<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import TuiCursor from './TuiCursor.vue';

type CursorVariant = 'block' | 'underline' | 'bar';

const props = withDefaults(defineProps<{
  text: string;
  speed?: number;
  delay?: number;
  cursor?: boolean;
  cursorVariant?: CursorVariant;
  loop?: boolean;
}>(), {
  speed: 50,
  delay: 0,
  cursor: true,
  cursorVariant: 'block',
  loop: false
});

const emit = defineEmits<{
  complete: [];
  start: [];
}>();

const displayedText = ref('');
const isTyping = ref(false);
const showCursor = ref(true);

let timeoutId: number | null = null;
let charIndex = 0;

function typeNextChar() {
  if (charIndex < props.text.length) {
    displayedText.value += props.text[charIndex];
    charIndex++;
    timeoutId = window.setTimeout(typeNextChar, props.speed);
  } else {
    isTyping.value = false;
    emit('complete');
    if (props.loop) {
      timeoutId = window.setTimeout(() => {
        charIndex = 0;
        displayedText.value = '';
        startTyping();
      }, 2000);
    }
  }
}

function startTyping() {
  isTyping.value = true;
  emit('start');
  timeoutId = window.setTimeout(typeNextChar, props.delay);
}

function reset() {
  if (timeoutId !== null) {
    clearTimeout(timeoutId);
  }
  charIndex = 0;
  displayedText.value = '';
  isTyping.value = false;
}

watch(() => props.text, () => {
  reset();
  startTyping();
});

onMounted(() => {
  startTyping();
});

onUnmounted(() => {
  if (timeoutId !== null) {
    clearTimeout(timeoutId);
  }
});
</script>

<template>
  <span class="tui-typewriter">
    <span class="tui-typewriter__text">{{ displayedText }}</span>
    <TuiCursor
      v-if="cursor && showCursor"
      :variant="cursorVariant"
      :blink="!isTyping"
    />
  </span>
</template>

<style scoped>
.tui-typewriter {
  display: inline;
  font-family: var(--tui-font-mono);
  color: var(--tui-text-primary);
}

.tui-typewriter__text {
  white-space: pre-wrap;
}

@media (prefers-reduced-motion: reduce) {
  .tui-typewriter__text {
    /* Show full text immediately if reduced motion is preferred */
  }
}
</style>
