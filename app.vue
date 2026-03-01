<template>
  <div class="min-h-screen font-body">
    <NuxtPage />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { font-family: 'Outfit', sans-serif; overflow-x: hidden; }

:root {
  --accent: #38bdf8;
  --card: rgba(255,255,255,0.06);
  --border: rgba(255,255,255,0.1);
}

::-webkit-scrollbar { width: 3px; height: 3px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }

.glass {
  background: var(--card);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--border);
}

.glass-hover {
  transition: all 0.25s ease;
}
.glass-hover:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.2);
  transform: translateY(-1px);
}

.shimmer {
  background: linear-gradient(90deg,
    rgba(255,255,255,0.04) 0%,
    rgba(255,255,255,0.1) 40%,
    rgba(255,255,255,0.04) 80%);
  background-size: 200% 100%;
  animation: shimmer 1.8s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pulse-ring {
  0% { transform: scale(0.9); opacity: 0.8; }
  70% { transform: scale(1.3); opacity: 0; }
  100% { transform: scale(1.3); opacity: 0; }
}

@keyframes spin-slow {
  to { transform: rotate(360deg); }
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-12px) rotate(2deg); }
  66% { transform: translateY(-6px) rotate(-1deg); }
}

@keyframes rain {
  0% { transform: translateY(-100vh) translateX(0); opacity: 1; }
  100% { transform: translateY(100vh) translateX(-30px); opacity: 0.3; }
}

@keyframes snow {
  0% { transform: translateY(-100vh) translateX(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) translateX(50px) rotate(360deg); opacity: 0.3; }
}

@keyframes twinkle {
  0%, 100% { opacity: 0.2; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

@keyframes lightning {
  0%, 90%, 100% { opacity: 0; }
  92%, 96% { opacity: 0.15; }
}

.anim-fade-up { animation: fadeUp 0.5s ease-out both; }
.anim-fade-in { animation: fadeIn 0.4s ease-out both; }
</style>
