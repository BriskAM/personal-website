<template>
  <footer class="mt-20 pt-8 pb-12 border-t border-white/10 text-sm text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-4">
    <div class="flex items-center gap-2">
      <span>&copy; {{ new Date().getFullYear() }} {{ data.name }}</span>
      <span class="opacity-40">·</span>
      <span class="text-xs text-gray-500">Delhi, India</span>
    </div>
    <div class="flex items-center gap-4 text-xs">
      <a href="https://github.com/BriskAM" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors">GitHub</a>
      <a href="https://github.com/23f3001694" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors" title="Academic GitHub account">GitHub (IITM)</a>
      <a href="https://www.linkedin.com/in/akshit-mehta2005" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors">LinkedIn</a>
      <a href="/resume" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors">Resume</a>
    </div>
  </footer>
</template>

<script setup lang="ts">
import data from '../content/data.json';
</script>
