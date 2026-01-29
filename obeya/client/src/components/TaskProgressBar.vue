<script setup lang="ts">
import { TuiProgressBar } from './tui';

defineProps<{
  percent: number;
}>();
</script>

<template>
  <TuiProgressBar
    :percent="percent"
    :width="20"
    variant="block"
    :show-percent="true"
    :glow="percent >= 80"
  />
</template>
