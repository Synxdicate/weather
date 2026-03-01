<template>
  <div class="nav-pills">
    <NuxtLink to="/" class="nav-pill glass-hover" :class="{ active: route.path === '/' }">
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
      </svg>
      Weather
    </NuxtLink>
    <NuxtLink to="/map" class="nav-pill glass-hover" :class="{ active: route.path === '/map' }">
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
      </svg>
      Map
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
const route = useRoute()
</script>

<style scoped>
.nav-pills { display: flex; gap: 4px; }
.nav-pill {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 20px;
  font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.5);
  text-decoration: none; letter-spacing: 0.03em;
  border: 1px solid transparent; transition: all 0.2s;
}
.nav-pill.active {
  color: #fff;
  background: rgba(255,255,255,0.12) !important;
  border-color: rgba(255,255,255,0.2);
}
.nav-pill:hover { color: rgba(255,255,255,0.8); }
</style>
