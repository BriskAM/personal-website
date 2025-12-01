<template>
  <div 
    ref="cursor" 
    class="custom-cursor"
    :class="{ 'cursor-hover': isHovering }"
  ></div>
  <div 
    ref="cursorDot" 
    class="custom-cursor-dot"
  ></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

const cursor = ref<HTMLDivElement | null>(null);
const cursorDot = ref<HTMLDivElement | null>(null);
const isHovering = ref(false);

let mouseX = 0;
let mouseY = 0;
let cursorX = 0;
let cursorY = 0;

const handleMouseMove = (e: MouseEvent) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  
  // Dot follows immediately
  if (cursorDot.value) {
    cursorDot.value.style.left = `${mouseX}px`;
    cursorDot.value.style.top = `${mouseY}px`;
  }
};

const handleMouseOver = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.closest('a') || target.closest('button')) {
    isHovering.value = true;
  }
};

const handleMouseOut = () => {
  isHovering.value = false;
};

const animate = () => {
  // Smooth follow for outer cursor
  const dx = mouseX - cursorX;
  const dy = mouseY - cursorY;
  
  cursorX += dx * 0.15;
  cursorY += dy * 0.15;
  
  if (cursor.value) {
    cursor.value.style.left = `${cursorX}px`;
    cursor.value.style.top = `${cursorY}px`;
  }
  
  requestAnimationFrame(animate);
};

onMounted(() => {
  // Only enable on non-touch devices
  if (window.matchMedia('(pointer: fine)').matches) {
    document.body.classList.add('custom-cursor-enabled');
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseover', handleMouseOver);
    window.addEventListener('mouseout', handleMouseOut);
    animate();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseover', handleMouseOver);
  window.removeEventListener('mouseout', handleMouseOut);
});
</script>

<style>
.custom-cursor {
  position: fixed;
  width: 40px;
  height: 40px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  pointer-events: none;
  transform: translate(-50%, -50%);
  z-index: 9999;
  transition: width 0.2s, height 0.2s, border-color 0.2s, background-color 0.2s;
  mix-blend-mode: difference;
}

.custom-cursor.cursor-hover {
  width: 60px;
  height: 60px;
  border-color: rgba(255, 255, 255, 0.8);
  background-color: rgba(255, 255, 255, 0.1);
}

.custom-cursor-dot {
  position: fixed;
  width: 6px;
  height: 6px;
  background-color: white;
  border-radius: 50%;
  pointer-events: none;
  transform: translate(-50%, -50%);
  z-index: 10000;
}

/* Hide on mobile */
@media (pointer: coarse) {
  .custom-cursor,
  .custom-cursor-dot {
    display: none;
  }
}
</style>
