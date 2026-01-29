import { ref, onMounted, onUnmounted } from 'vue';

export interface ObeyaEvent {
  type: string;
  hookEventType?: string;
  sessionId?: string;
  projectId?: number;
  timestamp?: number;
}

const DEBUG = true; // Enable frontend logging

function log(level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR', message: string, data?: unknown): void {
  const timestamp = new Date().toISOString().slice(11, 23);
  const prefix = `[${timestamp}] [Obeya:${level}]`;
  const style = {
    INFO: 'color: #10b981',
    DEBUG: 'color: #6b7280',
    WARN: 'color: #f59e0b',
    ERROR: 'color: #ef4444',
  }[level];

  if (data !== undefined) {
    console.log(`%c${prefix} ${message}`, style, data);
  } else {
    console.log(`%c${prefix} ${message}`, style);
  }
}

export function useWebSocket() {
  const isConnected = ref(false);
  const lastEvent = ref<ObeyaEvent | null>(null);
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let eventCount = 0;

  function connect() {
    const wsUrl = `ws://${window.location.hostname}:4001/stream`;
    log('INFO', `📡 Connecting to WebSocket: ${wsUrl}`);
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      isConnected.value = true;
      log('INFO', '✅ WebSocket connected');
    };

    ws.onclose = () => {
      isConnected.value = false;
      log('WARN', '📴 WebSocket disconnected, reconnecting in 3s...');
      reconnectTimeout = setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      log('ERROR', '❌ WebSocket error:', error);
      ws?.close();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ObeyaEvent;
        eventCount++;
        log('INFO', `═══════════════════════════════════════════════════`);
        log('INFO', `📥 EVENT #${eventCount} RECEIVED`);
        log('INFO', `📌 Type: ${data.type}`);
        if (data.hookEventType) {
          log('INFO', `🔗 Hook: ${data.hookEventType}`);
        }
        if (data.sessionId) {
          log('INFO', `📋 Session: ${data.sessionId.slice(0, 8)}...`);
        }
        if (data.projectId) {
          log('INFO', `📁 Project ID: ${data.projectId}`);
        }
        if (DEBUG) {
          log('DEBUG', 'Full event payload:', data);
        }
        log('INFO', `═══════════════════════════════════════════════════`);

        lastEvent.value = data;

        // Dispatch custom event for components to listen
        window.dispatchEvent(new CustomEvent('obeya-event', { detail: data }));
        log('DEBUG', '📤 Dispatched obeya-event to window');
      } catch (err) {
        log('ERROR', '❌ Failed to parse WebSocket message:', err);
      }
    };
  }

  function disconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    ws?.close();
    ws = null;
  }

  onMounted(() => {
    connect();
  });

  onUnmounted(() => {
    disconnect();
  });

  return {
    isConnected,
    lastEvent,
  };
}
