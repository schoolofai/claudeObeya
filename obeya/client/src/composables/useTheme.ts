import { ref, watch, onMounted } from 'vue';

export type ThemeName = 'green-phosphor' | 'amber-crt' | 'cool-cyan' | 'syntax';
export type EffectsLevel = 'full' | 'reduced' | 'none';

const STORAGE_KEY_THEME = 'tui-theme';
const STORAGE_KEY_EFFECTS = 'tui-effects';

const THEMES: ThemeName[] = ['green-phosphor', 'amber-crt', 'cool-cyan', 'syntax'];

const currentTheme = ref<ThemeName>('green-phosphor');
const effectsLevel = ref<EffectsLevel>('full');

function loadFromStorage(): void {
  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) as ThemeName | null;
  const savedEffects = localStorage.getItem(STORAGE_KEY_EFFECTS) as EffectsLevel | null;

  if (savedTheme && THEMES.includes(savedTheme)) {
    currentTheme.value = savedTheme;
  }

  if (savedEffects && ['full', 'reduced', 'none'].includes(savedEffects)) {
    effectsLevel.value = savedEffects;
  }

  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    effectsLevel.value = 'reduced';
  }
}

function applyTheme(theme: ThemeName): void {
  document.documentElement.setAttribute('data-theme', theme);
}

function applyEffects(level: EffectsLevel): void {
  if (level === 'none') {
    document.documentElement.setAttribute('data-effects', 'reduced');
  } else if (level === 'reduced') {
    document.documentElement.setAttribute('data-effects', 'reduced');
  } else {
    document.documentElement.removeAttribute('data-effects');
  }
}

export function useTheme() {
  onMounted(() => {
    loadFromStorage();
    applyTheme(currentTheme.value);
    applyEffects(effectsLevel.value);
  });

  watch(currentTheme, (newTheme) => {
    applyTheme(newTheme);
    localStorage.setItem(STORAGE_KEY_THEME, newTheme);
  });

  watch(effectsLevel, (newLevel) => {
    applyEffects(newLevel);
    localStorage.setItem(STORAGE_KEY_EFFECTS, newLevel);
  });

  function setTheme(theme: ThemeName): void {
    currentTheme.value = theme;
  }

  function setEffects(level: EffectsLevel): void {
    effectsLevel.value = level;
  }

  function cycleTheme(): void {
    const currentIndex = THEMES.indexOf(currentTheme.value);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    currentTheme.value = THEMES[nextIndex];
  }

  function cycleEffects(): void {
    const levels: EffectsLevel[] = ['full', 'reduced', 'none'];
    const currentIndex = levels.indexOf(effectsLevel.value);
    const nextIndex = (currentIndex + 1) % levels.length;
    effectsLevel.value = levels[nextIndex];
  }

  function getThemeLabel(theme: ThemeName): string {
    const labels: Record<ThemeName, string> = {
      'green-phosphor': 'Green Phosphor',
      'amber-crt': 'Amber CRT',
      'cool-cyan': 'Cool Cyan',
      'syntax': 'Syntax'
    };
    return labels[theme];
  }

  return {
    currentTheme,
    effectsLevel,
    themes: THEMES,
    setTheme,
    setEffects,
    cycleTheme,
    cycleEffects,
    getThemeLabel
  };
}
