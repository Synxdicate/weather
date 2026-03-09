<template>
  <nav class="nav-pills" role="navigation" aria-label="Main navigation">

    <NuxtLink
      to="/"
      class="nav-pill"
      :class="{ 'nav-active': isHome }"
      :aria-current="isHome ? 'page' : undefined"
      aria-label="Weather dashboard"
    >
      <!-- active glow dot -->
      <span v-if="isHome" class="nav-active-dot" aria-hidden="true" />

      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
      </svg>
      <span class="nav-label">Weather</span>
    </NuxtLink>

    <NuxtLink
      to="/map"
      class="nav-pill"
      :class="{ 'nav-active': isMap }"
      :aria-current="isMap ? 'page' : undefined"
      aria-label="Interactive weather map"
    >
      <span v-if="isMap" class="nav-active-dot" aria-hidden="true" />

      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
      </svg>
      <span class="nav-label">Map</span>
    </NuxtLink>

  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route  = useRoute()
const isHome = computed(() => route.path === '/')
const isMap  = computed(() => route.path === '/map')
</script>

<style scoped>
.nav-pills {
  display: flex;
  gap: 4px;
  align-items: center;
}

.nav-pill {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  font-family: 'Outfit', sans-serif;
  color: rgba(255, 255, 255, 0.45);
  text-decoration: none;
  letter-spacing: 0.04em;
  border: 1px solid transparent;
  transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
  white-space: nowrap;
  outline: none;
}

/* Hover */
.nav-pill:hover {
  color: rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-1px);
}

/* Active / current page */
.nav-pill.nav-active {
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.22);
}

/* Keyboard focus ring */
.nav-pill:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 2px;
}

/* Active indicator dot */
.nav-active-dot {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent, #38bdf8);
  box-shadow: 0 0 6px var(--accent, #38bdf8);
  animation: dotPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes dotPop {
  from { transform: translateX(-50%) scale(0); opacity: 0; }
  to   { transform: translateX(-50%) scale(1); opacity: 1; }
}

/* Hide label text on very small screens, keep icon */
@media (max-width: 400px) {
  .nav-label { display: none; }
  .nav-pill  { padding: 6px 10px; }
}
</style>