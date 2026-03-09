<template>
  <div class="app-root">
    <NuxtPage />
  </div>
</template>

<!-- No script needed — all logic lives in pages/composables -->

<style>
/* ─────────────────────────────────────────────────────────────────
   Fonts
───────────────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap');

/* ─────────────────────────────────────────────────────────────────
   CSS Custom Properties
───────────────────────────────────────────────────────────────── */
:root {
  /* Brand */
  --accent:        #38bdf8;
  --accent-dim:    rgba(56, 189, 248, 0.15);
  --accent-glow:   rgba(56, 189, 248, 0.35);

  /* Surfaces */
  --card:          rgba(255, 255, 255, 0.06);
  --card-hover:    rgba(255, 255, 255, 0.10);
  --border:        rgba(255, 255, 255, 0.10);
  --border-bright: rgba(255, 255, 255, 0.22);

  /* Text */
  --text-primary:   #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.65);
  --text-muted:     rgba(255, 255, 255, 0.35);
  --text-faint:     rgba(255, 255, 255, 0.18);

  /* Spacing */
  --radius-sm:   8px;
  --radius-md:   14px;
  --radius-lg:   20px;
  --radius-xl:   28px;

  /* Transitions */
  --transition-fast:   0.15s ease;
  --transition-normal: 0.25s ease;
  --transition-slow:   0.4s ease;

  /* Z layers */
  --z-map:     1;
  --z-overlay: 500;
  --z-modal:   700;
  --z-toast:   900;
}

/* ─────────────────────────────────────────────────────────────────
   Reset & Box Model
───────────────────────────────────────────────────────────────── */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ─────────────────────────────────────────────────────────────────
   Base HTML
───────────────────────────────────────────────────────────────── */
html {
  scroll-behavior: smooth;
  /* Prevent font size inflation on iOS */
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  font-family: 'Outfit', sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: var(--text-primary);
  background: #080c1c;
  overflow-x: hidden;
  /* Smooth font rendering */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Prevent pull-to-refresh on mobile maps */
body.map-page {
  overscroll-behavior: none;
}

/* ─────────────────────────────────────────────────────────────────
   Typography defaults
───────────────────────────────────────────────────────────────── */
h1, h2, h3, h4, h5, h6 {
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

button, input, select, textarea {
  font-family: inherit;
}

a {
  color: inherit;
}

/* ─────────────────────────────────────────────────────────────────
   Scrollbars
───────────────────────────────────────────────────────────────── */
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.14);
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.28);
}

/* ─────────────────────────────────────────────────────────────────
   Accessibility — Focus visible
───────────────────────────────────────────────────────────────── */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
}

/* ─────────────────────────────────────────────────────────────────
   Glass utility
───────────────────────────────────────────────────────────────── */
.glass {
  background: var(--card);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--border);
}

.glass-bright {
  background: rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--border-bright);
}

/* ─────────────────────────────────────────────────────────────────
   Interactive utilities
───────────────────────────────────────────────────────────────── */
.glass-hover {
  transition: background var(--transition-normal),
              border-color var(--transition-normal),
              transform var(--transition-fast);
}
.glass-hover:hover {
  background: var(--card-hover);
  border-color: var(--border-bright);
  transform: translateY(-1px);
}
.glass-hover:active {
  transform: translateY(0);
}

/* ─────────────────────────────────────────────────────────────────
   Shimmer skeleton loader
───────────────────────────────────────────────────────────────── */
.shimmer {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 0%,
    rgba(255, 255, 255, 0.10) 40%,
    rgba(255, 255, 255, 0.04) 80%
  );
  background-size: 200% 100%;
  animation: shimmer 1.8s ease-in-out infinite;
}

/* ─────────────────────────────────────────────────────────────────
   Animation utility classes
───────────────────────────────────────────────────────────────── */
.anim-fade-up  { animation: fadeUp  0.5s ease-out both; }
.anim-fade-in  { animation: fadeIn  0.4s ease-out both; }
.anim-scale-in { animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.anim-slide-up { animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) both; }

/* ─────────────────────────────────────────────────────────────────
   Keyframes
───────────────────────────────────────────────────────────────── */
@keyframes shimmer {
  0%   { background-position:  200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0);    }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to   { opacity: 1; transform: scale(1);   }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0);    }
}

@keyframes spin-slow {
  to { transform: rotate(360deg); }
}

@keyframes float {
  0%, 100% { transform: translateY(0px)   rotate(0deg);  }
  33%       { transform: translateY(-12px) rotate(2deg);  }
  66%       { transform: translateY(-6px)  rotate(-1deg); }
}

@keyframes pulse-ring {
  0%   { transform: scale(0.9); opacity: 0.8; }
  70%  { transform: scale(1.3); opacity: 0;   }
  100% { transform: scale(1.3); opacity: 0;   }
}

@keyframes lightning {
  0%, 90%, 100% { opacity: 0;    }
  92%, 96%      { opacity: 0.15; }
}

@keyframes hintPulse {
  0%, 100% { opacity: 1;   transform: scale(1);   }
  50%       { opacity: 0.4; transform: scale(0.7); }
}

@keyframes pinPop {
  from { transform: scale(0.4) translateY(20px); opacity: 0; }
  to   { transform: scale(1)   translateY(0);    opacity: 1; }
}

@keyframes dotBounce {
  0%, 80%, 100% { transform: scale(0); }
  40%           { transform: scale(1); }
}

/* ─────────────────────────────────────────────────────────────────
   App wrapper
───────────────────────────────────────────────────────────────── */
.app-root {
  min-height: 100dvh;        /* dynamic viewport height — better on mobile */
  min-height: 100vh;         /* fallback */
  position: relative;
}

/* ─────────────────────────────────────────────────────────────────
   Selection color
───────────────────────────────────────────────────────────────── */
::selection {
  background: rgba(56, 189, 248, 0.35);
  color: #fff;
}

/* ─────────────────────────────────────────────────────────────────
   Reduced motion — respect user OS preference
───────────────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* ─────────────────────────────────────────────────────────────────
   Print — strip animations and backgrounds
───────────────────────────────────────────────────────────────── */
@media print {
  body { background: #fff; color: #000; }
  .glass, .glass-bright { background: #f9f9f9; backdrop-filter: none; border: 1px solid #ddd; }
  .shimmer { animation: none; }
}
</style>