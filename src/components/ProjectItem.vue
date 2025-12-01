<template>
  <div class="mb-2">
    <div class="flex items-baseline justify-between">
      <h3 class="font-medium text-gray-100">
        <a v-if="href" :href="href" target="_blank" rel="noopener noreferrer" class="hover:underline decoration-gray-600 underline-offset-2">
          {{ title }}
        </a>
        <span v-else>{{ title }}</span>
      </h3>
      <span class="text-sm text-gray-500 font-mono">{{ year }}</span>
    </div>
    <p class="text-gray-400 leading-relaxed mt-1">
      <slot></slot>
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  year?: string;
  href?: string;
}>();
</script>
