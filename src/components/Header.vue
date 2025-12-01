<template>
  <header>
    <h1 class="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white mb-2">
      <a href="/" class="hover:text-gray-300 transition-colors">{{ data.name }}</a>
    </h1>
    <p class="text-gray-400 text-base sm:text-lg">{{ data.tagline }}</p>
    <p class="text-gray-500 text-sm sm:text-base mt-1">{{ data.subtitle }}</p>
  </header>
</template>

<script setup lang="ts">
import data from '../content/data.json';
</script>
