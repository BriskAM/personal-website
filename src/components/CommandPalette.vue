<template>
  <Teleport to="body">
    <div 
      v-if="isOpen" 
      class="command-palette-backdrop fixed inset-0 z-[100] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
      @click.self="close"
    >
      <div 
        class="command-palette w-full max-w-lg overflow-hidden rounded-none border shadow-2xl transition-all"
        :class="isLight ? 'bg-[#faf9f6] border-stone-200 text-stone-900' : 'bg-[#121212] border-white/15 text-gray-100'"
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        <!-- Search Input -->
        <div class="flex items-center px-4 py-3 border-b" :class="isLight ? 'border-stone-200' : 'border-white/10'">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-50 mr-3">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </svg>
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            placeholder="Type a command or search..."
            class="w-full bg-transparent text-sm focus:outline-none placeholder:text-stone-400"
            @keydown.down.prevent="navigateDown"
            @keydown.up.prevent="navigateUp"
            @keydown.enter.prevent="executeSelected"
            @keydown.esc="close"
          />
          <kbd 
            class="text-[10px] px-1.5 py-0.5 font-mono rounded-none border uppercase"
            :class="isLight ? 'bg-stone-100 border-stone-300 text-stone-600' : 'bg-white/5 border-white/15 text-gray-400'"
          >
            ESC
          </kbd>
        </div>

        <!-- Commands List -->
        <div 
          ref="listRef"
          class="max-h-72 overflow-y-auto p-2 palette-scrollbar"
          tabindex="-1"
        >
          <div v-if="filteredCommands.length === 0" class="py-6 text-center text-sm opacity-50">
            No matching commands found.
          </div>

          <button
            v-for="(cmd, index) in filteredCommands"
            :key="cmd.id"
            :ref="el => { if (el) itemRefs[index] = el as HTMLElement; }"
            type="button"
            class="w-full flex items-center justify-between px-3 py-2 text-sm rounded-none cursor-pointer transition-colors text-left"
            :class="[
              selectedIndex === index 
                ? (isLight ? 'bg-stone-200/70 text-stone-950' : 'bg-white/10 text-white') 
                : (isLight ? 'hover:bg-stone-100 text-stone-700' : 'hover:bg-white/5 text-gray-300')
            ]"
            @mousemove="onItemMouseMove(index)"
            @click="execute(cmd)"
          >
            <div class="flex items-center gap-2.5">
              <span class="opacity-60 flex items-center justify-center w-5 h-5 shrink-0">
                <svg v-if="cmd.icon === 'user'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <svg v-else-if="cmd.icon === 'briefcase'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                <svg v-else-if="cmd.icon === 'rocket'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
                <svg v-else-if="cmd.icon === 'zap'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <svg v-else-if="cmd.icon === 'graduation'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                <svg v-else-if="cmd.icon === 'mail'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                <svg v-else-if="cmd.icon === 'theme'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                <svg v-else-if="cmd.icon === 'game'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
                <svg v-else-if="cmd.icon === 'resume'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>
                <svg v-else-if="cmd.icon === 'github'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
                <svg v-else-if="cmd.icon === 'linkedin'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
                <svg v-else-if="cmd.icon === 'volume'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
              </span>
              <span>{{ cmd.title }}</span>
            </div>
            <span v-if="cmd.shortcut" class="text-[11px] font-mono opacity-50">{{ cmd.shortcut }}</span>
          </button>
        </div>

        <!-- Footer -->
        <div 
          class="flex items-center justify-between px-4 py-2 text-[11px] border-t opacity-60"
          :class="isLight ? 'border-stone-200 bg-stone-100/50' : 'border-white/5 bg-black/20'"
        >
          <span>Use <kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
          <span>Press <kbd>↵</kbd> to select</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';

interface Command {
  id: string;
  title: string;
  category: 'navigation' | 'action';
  icon: string;
  shortcut?: string;
  action: () => void;
}

const isOpen = ref(false);
const query = ref('');
const selectedIndex = ref(0);
const inputRef = ref<HTMLInputElement | null>(null);
const listRef = ref<HTMLElement | null>(null);
const itemRefs = ref<{ [key: number]: HTMLElement }>({});
const isLight = ref(false);
let isKeyboardNavigating = false;
let mouseMoveTimeout: number | null = null;

const onItemMouseMove = (index: number) => {
  if (isKeyboardNavigating) return;
  if (selectedIndex.value !== index) {
    selectedIndex.value = index;
  }
};

const updateThemeState = () => {
  isLight.value = typeof document !== 'undefined' && document.documentElement.classList.contains('light');
};

const commands: Command[] = [
  {
    id: 'about',
    title: 'Jump to About',
    category: 'navigation',
    icon: 'user',
    action: () => scrollToSection('about')
  },
  {
    id: 'education',
    title: 'Jump to Education',
    category: 'navigation',
    icon: 'graduation',
    action: () => scrollToSection('education')
  },
  {
    id: 'experience',
    title: 'Jump to Experience',
    category: 'navigation',
    icon: 'briefcase',
    action: () => scrollToSection('experience')
  },
  {
    id: 'projects',
    title: 'Jump to Projects',
    category: 'navigation',
    icon: 'rocket',
    action: () => scrollToSection('projects')
  },
  {
    id: 'skills',
    title: 'Jump to Skills',
    category: 'navigation',
    icon: 'zap',
    action: () => scrollToSection('skills')
  },
  {
    id: 'copy-email',
    title: 'Copy Email Address',
    category: 'action',
    icon: 'mail',
    shortcut: 'akshit.mehta.work@gmail.com',
    action: () => {
      navigator.clipboard.writeText('akshit.mehta.work@gmail.com');
      // @ts-ignore
      if (typeof window !== 'undefined' && window.showToast) {
        // @ts-ignore
        window.showToast('Email copied to clipboard!');
      }
    }
  },
  {
    id: 'toggle-theme',
    title: 'Toggle Light / Dark Theme',
    category: 'action',
    icon: 'theme',
    action: () => {
      const toggleBtn = document.getElementById('theme-toggle');
      if (toggleBtn) toggleBtn.click();
    }
  },
  {
    id: 'toggle-simulation',
    title: 'Play / Pause Game of Life',
    category: 'action',
    icon: 'game',
    shortcut: 'Space',
    action: () => {
      window.dispatchEvent(new CustomEvent('toggle-game-of-life'));
    }
  },
  {
    id: 'spawn-gun',
    title: 'Game of Life: Spawn Gosper Glider Gun',
    category: 'action',
    icon: 'game',
    shortcut: 'G',
    action: () => {
      window.dispatchEvent(new CustomEvent('spawn-glider-gun'));
      // @ts-ignore
      if (typeof window !== 'undefined' && window.showToast) {
        // @ts-ignore
        window.showToast('Glider Gun spawned');
      }
    }
  },
  {
    id: 'spawn-pulsar',
    title: 'Game of Life: Spawn Pulsar Oscillator',
    category: 'action',
    icon: 'game',
    shortcut: 'P',
    action: () => {
      window.dispatchEvent(new CustomEvent('spawn-pulsar'));
      // @ts-ignore
      if (typeof window !== 'undefined' && window.showToast) {
        // @ts-ignore
        window.showToast('Pulsar oscillator spawned');
      }
    }
  },
  {
    id: 'spawn-mordor',
    title: 'Easter Egg: Frodo & Sam overlooking Mordor (LotR Pixel Art)',
    category: 'action',
    icon: 'game',
    shortcut: 'M',
    action: () => {
      window.dispatchEvent(new CustomEvent('spawn-mordor'));
      // @ts-ignore
      if (typeof window !== 'undefined' && window.showToast) {
        // @ts-ignore
        window.showToast('Easter Egg: Frodo & Sam gazing upon Mordor');
      }
    }
  },
  {
    id: 'randomize-grid',
    title: 'Game of Life: Randomize Grid',
    category: 'action',
    icon: 'game',
    shortcut: 'R',
    action: () => {
      window.dispatchEvent(new CustomEvent('randomize-game-of-life'));
      // @ts-ignore
      if (typeof window !== 'undefined' && window.showToast) {
        // @ts-ignore
        window.showToast('Grid randomized');
      }
    }
  },
  {
    id: 'clear-grid',
    title: 'Game of Life: Clear Canvas',
    category: 'action',
    icon: 'game',
    shortcut: 'C',
    action: () => {
      window.dispatchEvent(new CustomEvent('clear-game-of-life'));
      // @ts-ignore
      if (typeof window !== 'undefined' && window.showToast) {
        // @ts-ignore
        window.showToast('Canvas cleared');
      }
    }
  },
  {
    id: 'toggle-sound',
    title: 'Toggle UI Sound Effects',
    category: 'action',
    icon: 'volume',
    action: () => {
      // @ts-ignore
      const isSound = typeof window !== 'undefined' && window.soundManager ? window.soundManager.toggle() : false;
      // @ts-ignore
      if (typeof window !== 'undefined' && window.showToast) {
        // @ts-ignore
        window.showToast(isSound ? 'Sound effects enabled' : 'Sound effects muted');
      }
    }
  },
  {
    id: 'resume',
    title: 'Download Resume (PDF)',
    category: 'action',
    icon: 'resume',
    action: () => window.open('/resume', '_blank')
  },
  {
    id: 'github',
    title: 'Open GitHub Profile',
    category: 'action',
    icon: 'github',
    action: () => window.open('https://github.com/BriskAM', '_blank')
  },
  {
    id: 'linkedin',
    title: 'Open LinkedIn Profile',
    category: 'action',
    icon: 'linkedin',
    action: () => window.open('https://www.linkedin.com/in/akshit-mehta2005', '_blank')
  }
];

const filteredCommands = computed(() => {
  if (!query.value.trim()) return commands;
  const q = query.value.toLowerCase().trim();
  return commands.filter(cmd => 
    cmd.title.toLowerCase().includes(q) || 
    cmd.id.toLowerCase().includes(q) ||
    (cmd.shortcut && cmd.shortcut.toLowerCase().includes(q))
  );
});

const scrollToSection = (id: string) => {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('in-view');
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.pushState(null, '', `#${id}`);
  }
};

const scrollToActiveItem = () => {
  nextTick(() => {
    const el = itemRefs.value[selectedIndex.value];
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });
};

watch(query, () => {
  selectedIndex.value = 0;
  if (listRef.value) {
    listRef.value.scrollTop = 0;
  }
});

const open = () => {
  query.value = '';
  selectedIndex.value = 0;
  itemRefs.value = {};
  isOpen.value = true;
  updateThemeState();
  if (typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden';
  }
  nextTick(() => {
    inputRef.value?.focus();
    if (listRef.value) {
      listRef.value.scrollTop = 0;
    }
  });
};

const close = () => {
  isOpen.value = false;
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
};

const setKeyboardNavigating = () => {
  isKeyboardNavigating = true;
  if (mouseMoveTimeout) window.clearTimeout(mouseMoveTimeout);
  mouseMoveTimeout = window.setTimeout(() => {
    isKeyboardNavigating = false;
  }, 250);
};

const navigateDown = () => {
  if (filteredCommands.value.length === 0) return;
  setKeyboardNavigating();
  selectedIndex.value = (selectedIndex.value + 1) % filteredCommands.value.length;
  scrollToActiveItem();
};

const navigateUp = () => {
  if (filteredCommands.value.length === 0) return;
  setKeyboardNavigating();
  selectedIndex.value = (selectedIndex.value - 1 + filteredCommands.value.length) % filteredCommands.value.length;
  scrollToActiveItem();
};

const execute = (cmd: Command) => {
  close();
  cmd.action();
};

const executeSelected = () => {
  const cmd = filteredCommands.value[selectedIndex.value];
  if (cmd) execute(cmd);
};

const handleKeyDown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (isOpen.value) close();
    else open();
  } else if (e.key === 'Escape' && isOpen.value) {
    close();
  }
};

onMounted(() => {
  updateThemeState();
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('open-command-palette', open);
  window.addEventListener('theme-change', updateThemeState);
});

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
  if (mouseMoveTimeout) window.clearTimeout(mouseMoveTimeout);
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('open-command-palette', open);
  window.removeEventListener('theme-change', updateThemeState);
});
</script>
