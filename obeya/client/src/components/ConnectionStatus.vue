<script setup lang="ts">
import { computed } from 'vue';
import { TuiBadge } from './tui';

const props = defineProps<{
  connected: boolean;
}>();

const variant = computed(() => props.connected ? 'success' : 'error');
const statusText = computed(() => props.connected ? 'ONLINE' : 'OFFLINE');
</script>

<template>
  <TuiBadge :variant="variant" :glow="connected">
    {{ statusText }}
  </TuiBadge>
</template>
