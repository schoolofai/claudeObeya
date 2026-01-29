<script setup lang="ts">
withDefaults(defineProps<{
  scanlines?: boolean;
  glow?: boolean;
  flicker?: boolean;
  vignette?: boolean;
  noise?: boolean;
}>(), {
  scanlines: true,
  glow: true,
  flicker: false,
  vignette: false,
  noise: false
});
</script>

<template>
  <div
    class="tui-crt"
    :class="{
      'tui-scanlines': scanlines,
      'tui-glow': glow,
      'tui-flicker-occasional': flicker,
      'tui-vignette': vignette,
      'tui-noise': noise
    }"
  >
    <slot></slot>
  </div>
</template>

<style scoped>
.tui-crt {
  position: relative;
  min-height: 100%;
}

/* Scanlines effect */
.tui-crt.tui-scanlines::before {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.1) 0px,
    rgba(0, 0, 0, 0.1) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
  z-index: 1000;
}

/* Glow effect applied to text */
.tui-crt.tui-glow {
  text-shadow:
    0 0 1px var(--tui-theme-primary-glow),
    0 0 2px var(--tui-theme-primary-glow);
}

/* Flicker effect */
.tui-crt.tui-flicker-occasional {
  animation: tui-flicker 5s infinite;
}

/* Vignette effect */
.tui-crt.tui-vignette::after {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(
    ellipse at center,
    transparent 50%,
    rgba(0, 0, 0, 0.4) 100%
  );
  pointer-events: none;
  z-index: 999;
}

/* Noise effect */
.tui-crt.tui-noise > *::after {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.015;
  pointer-events: none;
  z-index: 998;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .tui-crt.tui-flicker-occasional {
    animation: none;
  }

  .tui-crt.tui-scanlines::before {
    display: none;
  }
}

/* Allow explicit disabling via data attribute */
[data-effects="reduced"] .tui-crt.tui-scanlines::before,
[data-effects="reduced"] .tui-crt.tui-vignette::after,
[data-effects="reduced"] .tui-crt.tui-noise > *::after {
  display: none;
}

[data-effects="reduced"] .tui-crt.tui-flicker-occasional {
  animation: none;
}

[data-effects="reduced"] .tui-crt.tui-glow {
  text-shadow: none;
}
</style>
