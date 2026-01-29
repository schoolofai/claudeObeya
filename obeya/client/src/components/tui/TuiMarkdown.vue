<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { marked, type Tokens } from 'marked';
import hljs from 'highlight.js';
import TuiSpinner from './TuiSpinner.vue';

const props = withDefaults(defineProps<{
  content: string;
  loading?: boolean;
}>(), {
  loading: false,
});

onMounted(() => {
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  // Configure marked to use highlight.js for code blocks
  marked.use({
    renderer: {
      code(token: Tokens.Code) {
        const { text: code, lang: language } = token;
        const validLang = language && hljs.getLanguage(language);
        const highlighted = validLang
          ? hljs.highlight(code, { language }).value
          : hljs.highlightAuto(code).value;
        return `<pre class="tui-markdown__code-block"><code class="hljs language-${language || 'plaintext'}">${highlighted}</code></pre>`;
      },
    },
  });
});

const renderedContent = computed(() => {
  if (!props.content) return '';
  return marked.parse(props.content) as string;
});
</script>

<template>
  <div class="tui-markdown">
    <TuiSpinner v-if="loading" variant="braille" :speed="80">Loading...</TuiSpinner>
    <div v-else class="tui-markdown__content" v-html="renderedContent" />
  </div>
</template>

<style scoped>
.tui-markdown {
  font-family: var(--tui-font-mono);
  color: var(--tui-text-primary);
  line-height: 1.6;
}

.tui-markdown__content {
  overflow-x: auto;
}

/* Markdown heading styles */
.tui-markdown__content :deep(h1) {
  font-size: var(--tui-font-size-xl);
  font-weight: var(--tui-font-weight-bold);
  color: var(--tui-theme-primary-bright);
  margin: var(--tui-space-4) 0 var(--tui-space-3) 0;
  border-bottom: 1px solid var(--tui-border-muted);
  padding-bottom: var(--tui-space-2);
}

.tui-markdown__content :deep(h2) {
  font-size: var(--tui-font-size-lg);
  font-weight: var(--tui-font-weight-semibold);
  color: var(--tui-theme-primary);
  margin: var(--tui-space-4) 0 var(--tui-space-2) 0;
}

.tui-markdown__content :deep(h3) {
  font-size: var(--tui-font-size-base);
  font-weight: var(--tui-font-weight-semibold);
  color: var(--tui-cyan-base);
  margin: var(--tui-space-3) 0 var(--tui-space-2) 0;
}

.tui-markdown__content :deep(h4),
.tui-markdown__content :deep(h5),
.tui-markdown__content :deep(h6) {
  font-size: var(--tui-font-size-sm);
  font-weight: var(--tui-font-weight-medium);
  color: var(--tui-text-secondary);
  margin: var(--tui-space-2) 0;
}

/* Paragraph and text styles */
.tui-markdown__content :deep(p) {
  margin: var(--tui-space-2) 0;
}

.tui-markdown__content :deep(strong) {
  color: var(--tui-text-primary);
  font-weight: var(--tui-font-weight-semibold);
}

.tui-markdown__content :deep(em) {
  color: var(--tui-yellow-base);
  font-style: italic;
}

/* Link styles */
.tui-markdown__content :deep(a) {
  color: var(--tui-theme-primary);
  text-decoration: underline;
}

.tui-markdown__content :deep(a:hover) {
  color: var(--tui-theme-primary-bright);
}

/* List styles */
.tui-markdown__content :deep(ul),
.tui-markdown__content :deep(ol) {
  margin: var(--tui-space-2) 0;
  padding-left: var(--tui-space-4);
}

.tui-markdown__content :deep(li) {
  margin: var(--tui-space-1) 0;
}

.tui-markdown__content :deep(ul) {
  list-style-type: none;
}

.tui-markdown__content :deep(ul li::before) {
  content: "- ";
  color: var(--tui-text-muted);
}

/* Code styles */
.tui-markdown__content :deep(code) {
  background: var(--tui-bg-elevated);
  padding: 2px 4px;
  border: 1px solid var(--tui-border-muted);
  color: var(--tui-magenta-base);
  font-size: var(--tui-font-size-sm);
}

.tui-markdown__content :deep(.tui-markdown__code-block) {
  background: var(--tui-bg-surface);
  border: 1px solid var(--tui-border-muted);
  padding: var(--tui-space-3);
  margin: var(--tui-space-3) 0;
  overflow-x: auto;
}

.tui-markdown__content :deep(.tui-markdown__code-block code) {
  background: transparent;
  border: none;
  padding: 0;
  color: inherit;
  font-size: var(--tui-font-size-sm);
}

/* Blockquote styles */
.tui-markdown__content :deep(blockquote) {
  border-left: 2px solid var(--tui-theme-primary-dim);
  margin: var(--tui-space-3) 0;
  padding-left: var(--tui-space-3);
  color: var(--tui-text-secondary);
}

/* Table styles */
.tui-markdown__content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: var(--tui-space-3) 0;
}

.tui-markdown__content :deep(th),
.tui-markdown__content :deep(td) {
  border: 1px solid var(--tui-border-muted);
  padding: var(--tui-space-2);
  text-align: left;
}

.tui-markdown__content :deep(th) {
  background: var(--tui-bg-elevated);
  color: var(--tui-theme-primary);
  font-weight: var(--tui-font-weight-semibold);
}

.tui-markdown__content :deep(tr:nth-child(even)) {
  background: var(--tui-bg-surface);
}

/* Horizontal rule */
.tui-markdown__content :deep(hr) {
  border: none;
  border-top: 1px dashed var(--tui-border-muted);
  margin: var(--tui-space-4) 0;
}

/* Highlight.js theme overrides for TUI style */
.tui-markdown__content :deep(.hljs-keyword) {
  color: var(--tui-magenta-base);
}

.tui-markdown__content :deep(.hljs-string) {
  color: var(--tui-green-base);
}

.tui-markdown__content :deep(.hljs-number) {
  color: var(--tui-yellow-base);
}

.tui-markdown__content :deep(.hljs-comment) {
  color: var(--tui-text-muted);
}

.tui-markdown__content :deep(.hljs-function) {
  color: var(--tui-cyan-base);
}

.tui-markdown__content :deep(.hljs-class) {
  color: var(--tui-blue-base);
}

.tui-markdown__content :deep(.hljs-variable),
.tui-markdown__content :deep(.hljs-attr) {
  color: var(--tui-theme-primary);
}

.tui-markdown__content :deep(.hljs-built_in) {
  color: var(--tui-orange-base);
}

.tui-markdown__content :deep(.hljs-title) {
  color: var(--tui-cyan-base);
}
</style>
