<template>
  <footer class="mt-20 pt-8 border-t border-white/10 text-sm text-gray-500">
    <span>&copy; {{ new Date().getFullYear() }} {{ data.name }}</span>
  </footer>
</template>

<script setup lang="ts">
import data from '../content/data.json';
</script>
