<template>
  <a
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    class="text-gray-400 hover:text-white transition-colors border-b border-gray-700 hover:border-white pb-0.5"
  >
    <slot></slot>
  </a>
</template>

<script setup lang="ts">
defineProps<{
  href: string;
}>();
</script>
