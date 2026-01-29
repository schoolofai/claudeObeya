<script setup lang="ts">
import { ref } from 'vue';
import TuiCursor from './TuiCursor.vue';

const props = withDefaults(defineProps<{
  user?: string;
  host?: string;
  path?: string;
  promptChar?: string;
  readonly?: boolean;
  modelValue?: string;
}>(), {
  user: 'user',
  host: 'obeya',
  path: '~',
  promptChar: '$',
  readonly: false,
  modelValue: ''
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  submit: [value: string];
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const isFocused = ref(false);

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    emit('submit', props.modelValue);
  }
}

function focus() {
  inputRef.value?.focus();
}

defineExpose({ focus });
</script>

<template>
  <div class="tui-prompt" :class="{ 'tui-prompt--focused': isFocused }" @click="focus">
    <span class="tui-prompt__user">{{ user }}</span>
    <span class="tui-prompt__at">@</span>
    <span class="tui-prompt__host">{{ host }}</span>
    <span class="tui-prompt__colon">:</span>
    <span class="tui-prompt__path">{{ path }}</span>
    <span class="tui-prompt__char">{{ promptChar }}</span>
    <span class="tui-prompt__space">&nbsp;</span>
    <template v-if="readonly">
      <span class="tui-prompt__text">{{ modelValue }}</span>
      <TuiCursor v-if="isFocused" variant="block" />
    </template>
    <template v-else>
      <input
        ref="inputRef"
        type="text"
        class="tui-prompt__input"
        :value="modelValue"
        @input="handleInput"
        @keydown="handleKeydown"
        @focus="isFocused = true"
        @blur="isFocused = false"
        spellcheck="false"
        autocomplete="off"
      />
    </template>
  </div>
</template>

<style scoped>
.tui-prompt {
  display: flex;
  align-items: center;
  font-family: var(--tui-font-mono);
  font-size: var(--tui-font-size-base);
  line-height: var(--tui-line-height-base);
  cursor: text;
}

.tui-prompt__user {
  color: var(--tui-cyan-base);
}

.tui-prompt__at {
  color: var(--tui-text-muted);
}

.tui-prompt__host {
  color: var(--tui-magenta-base);
}

.tui-prompt__colon {
  color: var(--tui-text-muted);
}

.tui-prompt__path {
  color: var(--tui-blue-base);
}

.tui-prompt__char {
  color: var(--tui-theme-primary);
  font-weight: var(--tui-font-weight-bold);
}

.tui-prompt__space {
  width: 1ch;
}

.tui-prompt__text {
  color: var(--tui-text-primary);
}

.tui-prompt__input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: inherit;
  color: var(--tui-text-primary);
  caret-color: var(--tui-theme-primary);
  padding: 0;
  margin: 0;
}

.tui-prompt__input::selection {
  background: var(--tui-theme-primary);
  color: var(--tui-bg-base);
}
</style>
