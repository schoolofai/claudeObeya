<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import ConnectionStatus from './components/ConnectionStatus.vue';
import { TuiCrtEffect } from './components/tui';
import { useTheme } from './composables/useTheme';

const { currentTheme, cycleTheme, getThemeLabel } = useTheme();

const isConnected = ref(false);
let ws: WebSocket | null = null;

function connect() {
  const wsUrl = `ws://${window.location.hostname}:4001/stream`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    isConnected.value = true;
  };

  ws.onclose = () => {
    isConnected.value = false;
    setTimeout(connect, 3000);
  };

  ws.onerror = () => {
    ws?.close();
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'event_received') {
        window.dispatchEvent(new CustomEvent('obeya-event', { detail: data }));
      }
    } catch {
      // Ignore parse errors
    }
  };
}

onMounted(() => {
  connect();
});

onUnmounted(() => {
  ws?.close();
});
</script>

<template>
  <TuiCrtEffect :scanlines="true" :glow="true" :flicker="false">
    <div class="app">
      <header class="app-header">
        <div class="header-left">
          <router-link to="/" class="logo">
            <span class="logo-bracket">[</span>
            <span class="logo-icon">◉</span>
            <span class="logo-bracket">]</span>
            <span class="logo-text">OBEYA BOARD</span>
          </router-link>
        </div>
        <div class="header-right">
          <button class="theme-toggle" @click="cycleTheme" :title="`Theme: ${getThemeLabel(currentTheme)}`">
            <span class="theme-icon">◐</span>
            <span class="theme-label">{{ getThemeLabel(currentTheme) }}</span>
          </button>
          <ConnectionStatus :connected="isConnected" />
        </div>
      </header>
      <main class="app-main">
        <router-view />
      </main>
      <footer class="app-footer">
        <span class="footer-text">═══ Claude Code Multi-Agent Observability ═══</span>
      </footer>
    </div>
  </TuiCrtEffect>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--tui-bg-base);
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--tui-space-3) var(--tui-space-6);
  background: var(--tui-bg-surface);
  border-bottom: 1px solid var(--tui-border-muted);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--tui-space-6);
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--tui-space-2);
  text-decoration: none;
  color: var(--tui-text-primary);
}

.logo:hover {
  text-decoration: none;
}

.logo-bracket {
  color: var(--tui-text-muted);
}

.logo-icon {
  color: var(--tui-theme-primary);
  font-size: var(--tui-font-size-md);
  text-shadow:
    0 0 4px var(--tui-theme-primary-glow),
    0 0 8px var(--tui-theme-primary-glow);
}

.logo-text {
  font-size: var(--tui-font-size-base);
  font-weight: var(--tui-font-weight-semibold);
  letter-spacing: var(--tui-letter-spacing-wider);
  color: var(--tui-theme-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--tui-space-4);
}

.theme-toggle {
  display: flex;
  align-items: center;
  gap: var(--tui-space-2);
  padding: var(--tui-space-1) var(--tui-space-3);
  background: transparent;
  border: 1px solid var(--tui-border-muted);
  color: var(--tui-text-secondary);
  font-family: var(--tui-font-mono);
  font-size: var(--tui-font-size-sm);
  cursor: pointer;
  transition: all var(--tui-duration-fast);
}

.theme-toggle:hover {
  border-color: var(--tui-theme-primary);
  color: var(--tui-theme-primary);
  background: transparent;
}

.theme-icon {
  font-size: var(--tui-font-size-base);
}

.theme-label {
  display: none;
}

@media (min-width: 640px) {
  .theme-label {
    display: inline;
  }
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--tui-space-6);
  min-height: 0; /* Allow flex children to shrink */
}

.app-footer {
  padding: var(--tui-space-3) var(--tui-space-6);
  text-align: center;
  border-top: 1px solid var(--tui-border-muted);
  background: var(--tui-bg-surface);
}

.footer-text {
  font-size: var(--tui-font-size-xs);
  color: var(--tui-text-muted);
  letter-spacing: var(--tui-letter-spacing-wide);
}
</style>
