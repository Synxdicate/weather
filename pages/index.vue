<template>
  <div class="page-wrap" :style="{ '--accent': theme.accent }">
    <!-- Animated background -->
    <div class="bg-layer">
      <div class="bg-gradient" :class="theme.bg" />
      <canvas ref="canvasRef" class="particles-canvas" />
      <!-- Lightning flash for thunderstorm -->
      <div v-if="isThunder" class="lightning-flash" />
    </div>

    <!-- Main layout -->
    <div class="content-wrap">
      <!-- TOP BAR -->
      <header class="topbar anim-fade-up">
        <div class="logo">
          <div class="logo-icon">
            <span>{{ currentEmoji }}</span>
          </div>
          <div>
            <div class="logo-title">SKYCAST</div>
            <div class="logo-sub">Open-Meteo · Free Forever</div>
          </div>
        </div>
        <div class="topbar-right">
          <NavBar />
          <div class="clock glass">{{ currentTime }}</div>
          <button class="btn-icon glass glass-hover" @click="fetchLocation" :disabled="locating" title="Detect location">
            <svg v-if="!locating" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinning">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- SEARCH -->
      <div class="search-wrap anim-fade-up" style="animation-delay:.08s">
        <form @submit.prevent="handleSearch" class="search-form glass">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" class="search-icon">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input v-model="searchQuery" type="text" placeholder="Search any city worldwide..."
            class="search-input" @keydown.esc="searchQuery = ''" />
          <button type="submit" class="search-btn" :disabled="!searchQuery.trim() || loading">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </form>
        <div class="quick-chips">
          <button v-for="c in cities" :key="c" @click="quickSearch(c)" class="chip glass glass-hover">{{ c }}</button>
        </div>
      </div>

      <!-- ERROR -->
      <div v-if="error" class="error-bar glass anim-fade-in">
        <span class="error-icon">⚠</span>
        <span>{{ error }}</span>
      </div>

      <!-- LOADING SKELETON -->
      <template v-if="loading">
        <div class="skeleton-wrap anim-fade-in">
          <div class="skeleton-hero glass">
            <div class="sk-line shimmer" style="width:200px;height:18px;margin-bottom:20px" />
            <div class="sk-line shimmer" style="width:160px;height:100px;margin-bottom:12px" />
            <div class="sk-line shimmer" style="width:240px;height:24px" />
          </div>
          <div class="skeleton-grid">
            <div v-for="i in 6" :key="i" class="sk-card shimmer glass" />
          </div>
        </div>
      </template>

      <!-- WEATHER CONTENT -->
      <template v-else-if="weather">
        <div class="weather-grid anim-fade-up" style="animation-delay:.12s">

          <!-- HERO CARD -->
          <div class="hero-card glass" :style="{ borderColor: theme.accent + '40' }">
            <div class="hero-left">
              <div class="city-row">
                <span class="city-name">{{ weather.city }}</span>
                <span class="country-tag">{{ weather.country }}</span>
                <span class="day-night-tag">{{ weather.is_day ? '☀ Day' : '🌙 Night' }}</span>
              </div>
              <div class="temp-display">
                <span class="temp-number">{{ weather.temp }}</span>
                <div class="temp-right">
                  <span class="temp-unit">°C</span>
                  <div class="condition-emoji">{{ iconToEmoji(weather.icon) }}</div>
                </div>
              </div>
              <div class="condition-desc">{{ weather.description }}</div>
              <div class="feels-like">Feels like <strong>{{ weather.feels_like }}°C</strong></div>

              <!-- Temp bar -->
              <div class="temp-range-bar">
                <span class="range-label">{{ forecast[0]?.low ?? '--' }}°</span>
                <div class="range-track">
                  <div class="range-fill" :style="{ width: tempBarWidth + '%', background: `linear-gradient(90deg, #38bdf8, ${theme.accent})` }" />
                </div>
                <span class="range-label">{{ forecast[0]?.high ?? '--' }}°</span>
              </div>
            </div>

            <div class="hero-right">
              <!-- Wind compass -->
              <div class="compass-wrap">
                <div class="compass-ring">
                  <div class="compass-label-n">N</div>
                  <div class="compass-label-s">S</div>
                  <div class="compass-label-e">E</div>
                  <div class="compass-label-w">W</div>
                  <div class="compass-needle" :style="{ transform: `rotate(${weather.wind_deg}deg)` }">
                    <div class="needle-north" />
                    <div class="needle-south" />
                  </div>
                  <div class="compass-center" />
                </div>
                <div class="wind-info">
                  <span class="wind-speed">{{ weather.wind_speed }}</span>
                  <span class="wind-unit">km/h {{ weather.wind_dir }}</span>
                </div>
              </div>

              <!-- UV meter -->
              <div class="uv-wrap glass-hover">
                <div class="uv-label">UV Index</div>
                <div class="uv-bar-wrap">
                  <div class="uv-bar-bg" />
                  <div class="uv-bar-fill" :style="{ width: Math.min(weather.uv / 12 * 100, 100) + '%' }" />
                </div>
                <div class="uv-value" :style="{ color: uvData.color }">
                  {{ weather.uv }} · {{ uvData.label }}
                </div>
              </div>
            </div>
          </div>

          <!-- STATS ROW -->
          <div class="stats-row">
            <div v-for="stat in stats" :key="stat.label" class="stat-card glass glass-hover">
              <div class="stat-icon">{{ stat.icon }}</div>
              <div class="stat-body">
                <div class="stat-label">{{ stat.label }}</div>
                <div class="stat-value">{{ stat.value }}<span class="stat-unit">{{ stat.unit }}</span></div>
              </div>
            </div>
          </div>

          <!-- SUN TIMES -->
          <div class="sun-card glass">
            <div class="sun-item">
              <div class="sun-icon">🌅</div>
              <div>
                <div class="sun-label">Sunrise</div>
                <div class="sun-time">{{ weather.sunrise }}</div>
              </div>
            </div>
            <div class="sun-arc-wrap">
              <svg viewBox="0 0 200 100" class="sun-arc-svg">
                <path d="M 10 90 Q 100 10 190 90" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>
                <path d="M 10 90 Q 100 10 190 90" fill="none" :stroke="theme.accent" stroke-width="2"
                  stroke-dasharray="280" :stroke-dashoffset="280 - (280 * sunProgress)" style="transition:stroke-dashoffset 1s ease"/>
                <circle :cx="sunX" :cy="sunY" r="6" :fill="theme.accent" />
              </svg>
            </div>
            <div class="sun-item sun-item-right">
              <div>
                <div class="sun-label">Sunset</div>
                <div class="sun-time">{{ weather.sunset }}</div>
              </div>
              <div class="sun-icon">🌇</div>
            </div>
          </div>

          <!-- HOURLY FORECAST -->
          <div class="hourly-card glass">
            <div class="section-title">
              <span>Hourly Forecast</span>
              <span class="section-sub">next 24h</span>
            </div>
            <div class="hourly-scroll">
              <div v-for="(h, i) in hourly" :key="i"
                class="hourly-item glass-hover"
                :class="{ 'hourly-now': i === 0 }"
                :style="i === 0 ? { borderColor: theme.accent + '80', background: theme.accent + '15' } : {}">
                <div class="hourly-time">{{ i === 0 ? 'Now' : h.time }}</div>
                <div class="hourly-emoji">{{ iconToEmoji(h.icon) }}</div>
                <div class="hourly-temp">{{ h.temp }}°</div>
                <div v-if="h.precip > 0" class="hourly-precip">{{ h.precip }}%</div>
              </div>
            </div>
          </div>

          <!-- 6-DAY FORECAST -->
          <div class="forecast-card glass">
            <div class="section-title">
              <span>6-Day Forecast</span>
            </div>
            <div class="forecast-list">
              <div v-for="(day, i) in forecast" :key="i"
                class="forecast-row glass-hover"
                :class="{ 'forecast-today': i === 0 }">
                <span class="forecast-day">{{ day.day }}</span>
                <span class="forecast-emoji">{{ iconToEmoji(day.icon) }}</span>
                <span class="forecast-cond">{{ day.condition }}</span>
                <div class="forecast-precip-wrap">
                  <span v-if="day.chance_of_rain > 0" class="forecast-precip">💧 {{ day.chance_of_rain }}%</span>
                </div>
                <div class="forecast-temps">
                  <span class="forecast-high">{{ day.high }}°</span>
                  <div class="forecast-bar">
                    <div class="forecast-bar-fill"
                      :style="{
                        marginLeft: ((day.low - minTemp) / tempRange * 100) + '%',
                        width: ((day.high - day.low) / tempRange * 100) + '%',
                        background: `linear-gradient(90deg, #38bdf8, ${theme.accent})`
                      }" />
                  </div>
                  <span class="forecast-low">{{ day.low }}°</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </template>

      <!-- EMPTY STATE -->
      <template v-else-if="!loading && !error">
        <div class="empty-state anim-fade-up" style="animation-delay:.1s">
          <div class="empty-globe">🌍</div>
          <h2 class="empty-title">Real-time Weather</h2>
          <p class="empty-sub">Search any city worldwide. Powered by Open-Meteo — 100% free, no API key needed.</p>
          <div class="empty-badge glass">
            <span style="color:var(--accent)">●</span> Free · No signup · No limits
          </div>
        </div>
      </template>

      <footer class="footer">
        Open-Meteo · OpenStreetMap · NuxtJS 3 · Tailwind CSS · Deploy on Vercel
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useWeather, iconToEmoji, getTheme, uvInfo, wmoToInfo } from '~/composables/useWeather'
const { weather, forecast, hourly, loading, error, fetchWeather, fetchByCoords } = useWeather()
const route = useRoute()

const searchQuery = ref('')
const locating = ref(false)
const currentTime = ref('')
const cities = ['Bangkok', 'Tokyo', 'London', 'New York', 'Dubai', 'Sydney', 'Paris']
const canvasRef = ref<HTMLCanvasElement | null>(null)
let animFrame: number
let timer: ReturnType<typeof setInterval>

// ─── Theme ───────────────────────────────────────────────────────
const theme = computed(() => getTheme(weather.value?.condition || '', weather.value?.is_day ?? 1))
const currentEmoji = computed(() => weather.value ? iconToEmoji(weather.value.icon) : '🌤')
const isThunder = computed(() => weather.value?.condition?.toLowerCase().includes('thunder'))
const uvData = computed(() => uvInfo(weather.value?.uv ?? 0))

// ─── Stats ────────────────────────────────────────────────────────
const stats = computed(() => weather.value ? [
  { icon: '💧', label: 'Humidity', value: weather.value.humidity, unit: '%' },
  { icon: '🔭', label: 'Visibility', value: weather.value.visibility, unit: ' km' },
  { icon: '🌡', label: 'Pressure', value: weather.value.pressure, unit: ' hPa' },
] : [])

// ─── Temp bar ─────────────────────────────────────────────────────
const tempBarWidth = computed(() => {
  if (!weather.value || !forecast.value[0]) return 50
  const { low, high } = forecast.value[0]
  if (high === low) return 50
  return Math.round((weather.value.temp - low) / (high - low) * 100)
})

// ─── Forecast bar range ───────────────────────────────────────────
const minTemp = computed(() => Math.min(...(forecast.value.map(d => d.low)), 0))
const maxTemp = computed(() => Math.max(...(forecast.value.map(d => d.high)), 0))
const tempRange = computed(() => Math.max(maxTemp.value - minTemp.value, 1))

// ─── Sun arc ──────────────────────────────────────────────────────
const sunProgress = computed(() => {
  if (!weather.value) return 0.5
  const now = new Date()
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const rise = toMin(weather.value.sunrise)
  const set = toMin(weather.value.sunset)
  if (nowMin <= rise) return 0
  if (nowMin >= set) return 1
  return (nowMin - rise) / (set - rise)
})
const sunX = computed(() => {
  const t = sunProgress.value
  return 10 + (190 - 10) * t
})
const sunY = computed(() => {
  const t = sunProgress.value
  // Quadratic bezier Y: (1-t)^2*90 + 2*(1-t)*t*10 + t^2*90
  return Math.round((1 - t) * (1 - t) * 90 + 2 * (1 - t) * t * 10 + t * t * 90)
})

// ─── Particle canvas ─────────────────────────────────────────────
interface Particle { x: number; y: number; vx: number; vy: number; size: number; opacity: number; life: number; maxLife: number }

function initCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const particles: Particle[] = []
  const cond = weather.value?.condition?.toLowerCase() || ''
  const isRain = cond.includes('rain') || cond.includes('drizzle')
  const isSnow = cond.includes('snow')
  const isClear = cond.includes('clear')
  const count = isRain ? 120 : isSnow ? 60 : isClear ? 40 : 25

  for (let i = 0; i < count; i++) {
    particles.push(makeParticle(canvas.width, canvas.height, isRain, isSnow, true))
  }

  function makeParticle(w: number, h: number, rain: boolean, snow: boolean, init = false): Particle {
    return {
      x: Math.random() * w,
      y: init ? Math.random() * h : -20,
      vx: rain ? -0.5 + Math.random() * -0.5 : snow ? (Math.random() - 0.5) * 0.8 : (Math.random() - 0.5) * 0.3,
      vy: rain ? 8 + Math.random() * 6 : snow ? 0.6 + Math.random() * 0.8 : 0.2 + Math.random() * 0.3,
      size: rain ? 1 + Math.random() : snow ? 2 + Math.random() * 3 : 1 + Math.random() * 2,
      opacity: rain ? 0.3 + Math.random() * 0.4 : snow ? 0.4 + Math.random() * 0.5 : 0.1 + Math.random() * 0.3,
      life: 0,
      maxLife: 100 + Math.random() * 200,
    }
  }

  const accentColor = theme.value.particle

  function draw() {
    if (!ctx || !canvas) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    particles.forEach((p, idx) => {
      p.x += p.vx
      p.y += p.vy
      p.life++

      if (p.y > canvas.height + 20 || p.life > p.maxLife) {
        particles[idx] = makeParticle(canvas.width, canvas.height, isRain, isSnow)
        return
      }

      ctx.save()
      ctx.globalAlpha = p.opacity

      if (isRain) {
        ctx.strokeStyle = accentColor === 'cyan' ? '#7dd3fc' : '#93c5fd'
        ctx.lineWidth = p.size * 0.6
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x + p.vx * 4, p.y + p.vy * 4)
        ctx.stroke()
      } else if (isSnow) {
        ctx.fillStyle = '#e0f2fe'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // Stars / dust
        const twinkle = Math.sin(Date.now() * 0.001 + p.x) * 0.3 + 0.7
        ctx.globalAlpha = p.opacity * twinkle
        ctx.fillStyle = accentColor === 'amber' ? '#fef3c7' : accentColor === 'indigo' ? '#c7d2fe' : '#e0f2fe'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    })

    animFrame = requestAnimationFrame(draw)
  }
  draw()
}

// ─── Lifecycle ────────────────────────────────────────────────────
onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
  // Support ?city= query param from map page
  const route = useRoute()
  const cityParam = route.query.city as string
  fetchWeather(cityParam || 'Bangkok')
})

onUnmounted(() => {
  clearInterval(timer)
  cancelAnimationFrame(animFrame)
})

watch(() => weather.value?.condition, async () => {
  cancelAnimationFrame(animFrame)
  await nextTick()
  setTimeout(initCanvas, 100)
})

function updateTime() {
  currentTime.value = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function handleSearch() {
  if (searchQuery.value.trim()) fetchWeather(searchQuery.value.trim())
}
function quickSearch(city: string) {
  searchQuery.value = city
  fetchWeather(city)
}
async function fetchLocation() {
  if (!navigator.geolocation) return
  locating.value = true
  try {
    const pos = await new Promise<GeolocationPosition>((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
    )
    await fetchByCoords(pos.coords.latitude, pos.coords.longitude)
  } catch (_) {}
  finally { locating.value = false }
}
</script>

<style scoped>
/* ── Layout ───────────────────────────────── */
.page-wrap { min-height: 100vh; position: relative; color: #fff; }
.bg-layer { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
.bg-gradient { position: absolute; inset: 0; background-size: 400% 400%; transition: background 1.5s ease; }
.from-\[\#0d0d1a\] { background: linear-gradient(135deg, #0d0d1a 0%, #1a0a2e 50%, #0d1117 100%); }
.from-\[\#0f1f3d\] { background: linear-gradient(135deg, #0f1f3d 0%, #1e3a5f 50%, #0d2137 100%); }
.from-\[\#0a0f1a\] { background: linear-gradient(135deg, #0a0f1a 0%, #111827 50%, #0f172a 100%); }
.from-\[\#111827\] { background: linear-gradient(135deg, #111827 0%, #1f2937 50%, #111827 100%); }
.from-\[\#020817\] { background: linear-gradient(135deg, #020817 0%, #0f172a 50%, #020617 100%); }
.from-\[\#0c1445\] { background: linear-gradient(135deg, #0c1445 0%, #1e3a8a 50%, #0c2461 100%); }
.particles-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.lightning-flash { position: absolute; inset: 0; background: white; animation: lightning 4s ease-in-out infinite; pointer-events: none; }
.content-wrap { position: relative; z-index: 1; max-width: 900px; margin: 0 auto; padding: 24px 16px 40px; }

/* ── Topbar ───────────────────────────────── */
.topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.logo { display: flex; align-items: center; gap: 10px; }
.logo-icon { width: 44px; height: 44px; border-radius: 14px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); display: flex; align-items: center; justify-content: center; font-size: 22px; }
.logo-title { font-size: 15px; font-weight: 800; letter-spacing: 0.15em; color: #fff; }
.logo-sub { font-size: 10px; color: rgba(255,255,255,0.35); letter-spacing: 0.05em; margin-top: 1px; }
.topbar-right { display: flex; align-items: center; gap: 8px; }
.clock { font-family: 'Space Mono', monospace; font-size: 12px; color: rgba(255,255,255,0.6); padding: 7px 14px; border-radius: 20px; }
.btn-icon { width: 36px; height: 36px; border-radius: 12px; border: none; cursor: pointer; color: rgba(255,255,255,0.6); display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.06); }
.btn-icon:hover { color: #fff; }
.btn-icon:disabled { opacity: 0.4; cursor: not-allowed; }
.spinning { animation: spin-slow 1s linear infinite; }

/* ── Search ───────────────────────────────── */
.search-wrap { margin-bottom: 16px; }
.search-form { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 16px; }
.search-icon { color: rgba(255,255,255,0.35); flex-shrink: 0; }
.search-input { flex: 1; background: transparent; border: none; outline: none; color: #fff; font-size: 14px; font-family: 'Outfit', sans-serif; }
.search-input::placeholder { color: rgba(255,255,255,0.3); }
.search-btn { width: 32px; height: 32px; border-radius: 10px; border: none; background: var(--accent); color: #000; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: opacity .2s, transform .15s; flex-shrink: 0; }
.search-btn:hover { opacity: 0.85; transform: scale(1.05); }
.search-btn:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }
.quick-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.chip { padding: 5px 12px; border-radius: 20px; border: none; cursor: pointer; font-size: 12px; font-family: 'Outfit', sans-serif; color: rgba(255,255,255,0.55); }

/* ── Error ────────────────────────────────── */
.error-bar { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 14px; margin-bottom: 16px; border-color: rgba(239,68,68,0.3) !important; color: #fca5a5; font-size: 13px; }
.error-icon { font-size: 18px; }

/* ── Skeleton ─────────────────────────────── */
.skeleton-wrap { display: flex; flex-direction: column; gap: 12px; }
.skeleton-hero { padding: 28px; border-radius: 24px; }
.sk-line { border-radius: 8px; }
.skeleton-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.sk-card { height: 80px; border-radius: 16px; }

/* ── Weather Grid ─────────────────────────── */
.weather-grid { display: flex; flex-direction: column; gap: 12px; }

/* ── Hero Card ────────────────────────────── */
.hero-card { border-radius: 28px; padding: 28px; display: flex; flex-direction: column; gap: 24px; border-width: 1px; border-style: solid; }
@media (min-width: 640px) { .hero-card { flex-direction: row; justify-content: space-between; } }
.hero-left { flex: 1; }
.city-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.city-name { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
.country-tag { padding: 3px 10px; background: rgba(255,255,255,0.1); border-radius: 20px; font-size: 11px; color: rgba(255,255,255,0.6); }
.day-night-tag { padding: 3px 10px; border: 1px solid rgba(255,255,255,0.15); border-radius: 20px; font-size: 11px; color: rgba(255,255,255,0.5); }
.temp-display { display: flex; align-items: flex-start; gap: 4px; margin-bottom: 8px; line-height: 1; }
.temp-number { font-size: 96px; font-weight: 900; letter-spacing: -0.04em; line-height: 0.9; }
.temp-right { display: flex; flex-direction: column; justify-content: flex-start; padding-top: 12px; }
.temp-unit { font-size: 32px; font-weight: 300; color: rgba(255,255,255,0.5); }
.condition-emoji { font-size: 40px; margin-top: 4px; }
.condition-desc { font-size: 16px; color: rgba(255,255,255,0.7); text-transform: capitalize; margin-bottom: 4px; }
.feels-like { font-size: 13px; color: rgba(255,255,255,0.4); margin-bottom: 16px; }
.feels-like strong { color: rgba(255,255,255,0.65); font-weight: 500; }
.temp-range-bar { display: flex; align-items: center; gap: 10px; max-width: 280px; }
.range-label { font-size: 12px; color: rgba(255,255,255,0.4); font-family: 'Space Mono', monospace; min-width: 28px; }
.range-track { flex: 1; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
.range-fill { height: 100%; border-radius: 2px; transition: width 1s ease; }

/* ── Hero Right ───────────────────────────── */
.hero-right { display: flex; flex-direction: row; gap: 16px; align-items: flex-start; }
@media (min-width: 640px) { .hero-right { flex-direction: column; align-items: center; min-width: 160px; } }

/* ── Compass ──────────────────────────────── */
.compass-wrap { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.compass-ring { position: relative; width: 90px; height: 90px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.2); }
.compass-label-n, .compass-label-s, .compass-label-e, .compass-label-w { position: absolute; font-size: 9px; font-family: 'Space Mono', monospace; color: rgba(255,255,255,0.4); }
.compass-label-n { top: 4px; left: 50%; transform: translateX(-50%); }
.compass-label-s { bottom: 4px; left: 50%; transform: translateX(-50%); }
.compass-label-e { right: 6px; top: 50%; transform: translateY(-50%); }
.compass-label-w { left: 6px; top: 50%; transform: translateY(-50%); }
.compass-needle { position: absolute; top: 50%; left: 50%; transform-origin: center; transition: transform 1s cubic-bezier(0.34, 1.56, 0.64, 1); width: 4px; margin-left: -2px; height: 60px; margin-top: -30px; }
.needle-north { width: 100%; height: 50%; background: var(--accent); border-radius: 2px 2px 0 0; }
.needle-south { width: 100%; height: 50%; background: rgba(255,255,255,0.2); border-radius: 0 0 2px 2px; }
.compass-center { position: absolute; top: 50%; left: 50%; width: 8px; height: 8px; background: #fff; border-radius: 50%; transform: translate(-50%, -50%); z-index: 2; }
.wind-info { text-align: center; }
.wind-speed { font-size: 22px; font-weight: 800; display: block; }
.wind-unit { font-size: 11px; color: rgba(255,255,255,0.45); }

/* ── UV ───────────────────────────────────── */
.uv-wrap { padding: 12px; border-radius: 14px; min-width: 120px; border: 1px solid rgba(255,255,255,0.08); }
@media (min-width: 640px) { .uv-wrap { width: 140px; } }
.uv-label { font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
.uv-bar-wrap { position: relative; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-bottom: 6px; }
.uv-bar-bg { position: absolute; inset: 0; background: linear-gradient(90deg, #4ade80, #facc15, #fb923c, #f87171, #c084fc); }
.uv-bar-fill { position: absolute; right: 0; top: 0; bottom: 0; background: rgba(0,0,0,0.6); transition: width 1s ease; }
.uv-value { font-size: 13px; font-weight: 600; transition: color 0.5s; }

/* ── Stats Row ────────────────────────────── */
.stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.stat-card { border-radius: 18px; padding: 16px; display: flex; align-items: center; gap: 12px; }
.stat-icon { font-size: 22px; }
.stat-label { font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 2px; }
.stat-value { font-size: 20px; font-weight: 700; }
.stat-unit { font-size: 11px; font-weight: 400; color: rgba(255,255,255,0.45); margin-left: 2px; }

/* ── Sun Card ─────────────────────────────── */
.sun-card { border-radius: 20px; padding: 20px 24px; display: flex; align-items: center; gap: 16px; }
.sun-item { display: flex; align-items: center; gap: 10px; min-width: 90px; }
.sun-item-right { justify-content: flex-end; }
.sun-icon { font-size: 24px; }
.sun-label { font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.08em; }
.sun-time { font-size: 20px; font-weight: 700; font-family: 'Space Mono', monospace; }
.sun-arc-wrap { flex: 1; }
.sun-arc-svg { width: 100%; height: auto; display: block; }

/* ── Hourly ───────────────────────────────── */
.hourly-card { border-radius: 22px; padding: 20px; }
.section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: rgba(255,255,255,0.4); margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }
.section-sub { font-weight: 400; font-size: 10px; }
.hourly-scroll { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
.hourly-scroll::-webkit-scrollbar { display: none; }
.hourly-item { min-width: 68px; padding: 12px 8px; border-radius: 14px; text-align: center; border: 1px solid rgba(255,255,255,0.06); cursor: default; transition: all 0.2s; flex-shrink: 0; }
.hourly-item:hover { background: rgba(255,255,255,0.1) !important; }
.hourly-time { font-size: 11px; color: rgba(255,255,255,0.4); margin-bottom: 8px; font-family: 'Space Mono', monospace; }
.hourly-emoji { font-size: 24px; margin-bottom: 8px; }
.hourly-temp { font-size: 15px; font-weight: 700; }
.hourly-precip { font-size: 10px; color: #7dd3fc; margin-top: 4px; }
.hourly-now { border-color: var(--accent) !important; }

/* ── Forecast ─────────────────────────────── */
.forecast-card { border-radius: 22px; padding: 20px; }
.forecast-list { display: flex; flex-direction: column; gap: 4px; }
.forecast-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; border: 1px solid transparent; transition: all 0.2s; }
.forecast-row:hover { border-color: rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); }
.forecast-today { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.08) !important; }
.forecast-day { width: 52px; font-size: 13px; font-weight: 600; }
.forecast-emoji { font-size: 20px; width: 28px; text-align: center; }
.forecast-cond { font-size: 12px; color: rgba(255,255,255,0.5); flex: 1; }
.forecast-precip-wrap { width: 48px; text-align: right; }
.forecast-precip { font-size: 11px; color: #7dd3fc; }
.forecast-temps { display: flex; align-items: center; gap: 8px; }
.forecast-high, .forecast-low { font-size: 13px; font-weight: 600; min-width: 30px; }
.forecast-low { color: rgba(255,255,255,0.4); text-align: right; }
.forecast-bar { width: 80px; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; position: relative; }
.forecast-bar-fill { position: absolute; top: 0; bottom: 0; border-radius: 2px; transition: all 0.8s ease; }

/* ── Empty ────────────────────────────────── */
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 80px 20px; }
.empty-globe { font-size: 80px; margin-bottom: 24px; animation: float 5s ease-in-out infinite; }
.empty-title { font-size: 28px; font-weight: 800; margin-bottom: 12px; }
.empty-sub { font-size: 14px; color: rgba(255,255,255,0.45); max-width: 360px; line-height: 1.6; margin-bottom: 24px; }
.empty-badge { padding: 10px 20px; border-radius: 20px; font-size: 12px; color: rgba(255,255,255,0.5); display: flex; align-items: center; gap: 8px; }

/* ── Footer ───────────────────────────────── */
.footer { text-align: center; font-size: 10px; color: rgba(255,255,255,0.18); margin-top: 32px; letter-spacing: 0.04em; }
</style>
