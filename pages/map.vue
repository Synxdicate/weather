<template>
  <div class="map-page">

    <!-- ── FULL-SCREEN MAP ─────────────────────── -->
    <div ref="mapEl" class="leaflet-map" />

    <!-- ── FLOATING HEADER ────────────────────── -->
    <div class="floating-header glass">
      <NuxtLink to="/" class="back-btn glass-hover">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
      </NuxtLink>
      <div class="header-brand">
        <span class="header-logo">🌤</span>
        <div>
          <div class="header-title">MAP EXPLORER</div>
          <div class="header-sub">Click anywhere · Real-time weather</div>
        </div>
      </div>
      <NavBar />
    </div>

    <!-- ── WEATHER OVERLAY PANEL ──────────────── -->
    <div class="overlay-panel glass">
      <div class="overlay-title">LAYERS</div>
      <div class="overlay-list">
        <button
          v-for="ov in overlays" :key="ov.id"
          class="ov-btn"
          :class="{ 'ov-active': activeOverlay === ov.id }"
          :style="activeOverlay === ov.id
            ? { background: ov.color + '25', borderColor: ov.color + '90', color: '#fff' }
            : {}"
          @click="toggleOverlay(ov.id)"
          :title="ov.name">
          <span class="ov-icon">{{ ov.icon }}</span>
          <span class="ov-name">{{ ov.name }}</span>
          <span v-if="activeOverlay === ov.id" class="ov-dot" :style="{ background: ov.color }" />
        </button>
      </div>
      <!-- Legend for active overlay -->
      <transition name="legend-fade">
        <div v-if="activeOverlay" class="ov-legend">
          <div class="legend-bar" :style="{ background: activeLegend.gradient }" />
          <div class="legend-labels">
            <span>{{ activeLegend.min }}</span>
            <span>{{ activeLegend.label }}</span>
            <span>{{ activeLegend.max }}</span>
          </div>
        </div>
      </transition>
    </div>

    <!-- ── CURSOR COORDS ───────────────────────── -->
    <div v-if="cursorCoords" class="coords-pill glass">
      {{ cursorCoords.lat.toFixed(3) }}°, {{ cursorCoords.lng.toFixed(3) }}°
    </div>

    <!-- ── LOADING OVERLAY ────────────────────── -->
    <transition name="fade">
      <div v-if="loadingClick" class="loading-overlay">
        <div class="loading-card glass">
          <div class="loading-rings">
            <div class="ring ring-1" />
            <div class="ring ring-2" />
            <div class="ring ring-3" />
          </div>
          <div class="loading-text">Fetching weather...</div>
          <div class="loading-coords">{{ pendingCoords?.lat.toFixed(2) }}°, {{ pendingCoords?.lng.toFixed(2) }}°</div>
        </div>
      </div>
    </transition>

    <!-- ── WEATHER SIDEBAR ────────────────────── -->
    <transition name="slide-right">
      <div v-if="clickedWeather" class="weather-sidebar glass" :style="{ '--acc': accentColor }">

        <!-- Close -->
        <button class="sidebar-close glass-hover" @click="closePanel">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <!-- Top: location info -->
        <div class="sb-location">
          <div class="sb-city">{{ clickedWeather.city }}</div>
          <div class="sb-country">{{ clickedWeather.country }}</div>
          <div class="sb-coords-tag">
            {{ clickedWeather.lat.toFixed(3) }}°, {{ clickedWeather.lon.toFixed(3) }}°
          </div>
        </div>

        <!-- Hero temp -->
        <div class="sb-hero">
          <div class="sb-temp-wrap">
            <div class="sb-temp">{{ clickedWeather.temp }}</div>
            <div class="sb-temp-right">
              <span class="sb-unit">°C</span>
              <span class="sb-emoji">{{ iconToEmoji(clickedWeather.icon) }}</span>
            </div>
          </div>
          <div class="sb-desc">{{ clickedWeather.description }}</div>
          <div class="sb-feels">Feels like {{ clickedWeather.feels_like }}°C</div>
        </div>

        <!-- Stats grid -->
        <div class="sb-stats">
          <div class="sb-stat" v-for="s in sidebarStats" :key="s.label">
            <div class="sb-stat-icon">{{ s.icon }}</div>
            <div class="sb-stat-val">{{ s.value }}</div>
            <div class="sb-stat-label">{{ s.label }}</div>
          </div>
        </div>

        <!-- ── MINI MAP ──────────────────────── -->
        <div class="minimap-wrap">
          <div class="minimap-label">LOCATION</div>
          <div ref="miniMapEl" class="minimap" />
          <div class="minimap-pin">📍</div>
        </div>

        <!-- Forecast strip -->
        <div class="sb-forecast" v-if="clickForecast.length">
          <div class="sb-forecast-label">5-DAY OUTLOOK</div>
          <div class="sb-forecast-row">
            <div v-for="d in clickForecast" :key="d.date" class="sb-fc-item">
              <div class="sb-fc-day">{{ d.day }}</div>
              <div class="sb-fc-emoji">{{ iconToEmoji(d.icon) }}</div>
              <div class="sb-fc-hi">{{ d.high }}°</div>
              <div class="sb-fc-lo">{{ d.low }}°</div>
            </div>
          </div>
        </div>

        <!-- Full forecast link -->
        <NuxtLink :to="`/?city=${encodeURIComponent(clickedWeather.city)}`" class="sb-full-btn" :style="{ background: accentColor }">
          Full Forecast & Hourly →
        </NuxtLink>

      </div>
    </transition>

    <!-- ── HINT (initial state) ────────────────── -->
    <transition name="fade">
      <div v-if="!clickedWeather && !loadingClick" class="hint-pill glass">
        <span class="hint-pulse" :style="{ background: '#38bdf8' }" />
        Click anywhere on the map to get weather
      </div>
    </transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { iconToEmoji, getTheme, wmoToInfo } from '~/composables/useWeather'
import type { WeatherData } from '~/composables/useWeather'

// ─── Refs ─────────────────────────────────────────────────────────
const mapEl    = ref<HTMLElement | null>(null)
const miniMapEl = ref<HTMLElement | null>(null)
const loadingClick  = ref(false)
const clickedWeather = ref<WeatherData | null>(null)
const clickForecast  = ref<any[]>([])
const cursorCoords   = ref<{ lat: number; lng: number } | null>(null)
const pendingCoords  = ref<{ lat: number; lng: number } | null>(null)
const activeOverlay  = ref<string | null>(null)

let L: any = null
let map: any = null
let miniMap: any = null
let clickMarker: any = null
let overlayLayer: any = null

// ─── Theme ────────────────────────────────────────────────────────
const accentColor = computed(() => getTheme(clickedWeather.value?.condition || 'Clear', clickedWeather.value?.is_day ?? 1).accent)

// ─── Sidebar stats ────────────────────────────────────────────────
const sidebarStats = computed(() => {
  const w = clickedWeather.value
  if (!w) return []
  return [
    { icon: '💧', label: 'Humidity',   value: w.humidity + '%' },
    { icon: '💨', label: 'Wind',       value: w.wind_speed + ' km/h ' + w.wind_dir },
    { icon: '👁',  label: 'Visibility', value: w.visibility + ' km' },
    { icon: '📊', label: 'Pressure',   value: w.pressure + ' hPa' },
    { icon: '🌅', label: 'Sunrise',    value: w.sunrise },
    { icon: '🌇', label: 'Sunset',     value: w.sunset },
  ]
})

// ─── Overlay definitions ─────────────────────────────────────────
// Using RainViewer (free, no key) for precipitation
// OpenWeatherMap free tile CDN for clouds & wind (no API key needed for tile visualization)
// Windy tiles (open)
const overlays = [
  {
    id: 'precipitation',
    name: 'Rain',
    icon: '🌧',
    color: '#38bdf8',
    // RainViewer - free global radar, no API key
    getTileUrl: () => `https://tilecache.rainviewer.com/v2/coverage/0/512/{z}/{x}/{y}/4/1_1.png`,
    opacity: 0.7,
    legend: { min: 'None', max: 'Heavy', label: 'Precipitation', gradient: 'linear-gradient(90deg,#1e3a5f,#3b82f6,#06b6d4,#10b981,#84cc16,#eab308,#f97316,#ef4444)' }
  },
  {
    id: 'clouds',
    name: 'Clouds',
    icon: '☁️',
    color: '#94a3b8',
    // OpenWeatherMap free tile (no key needed for this endpoint pattern)
    getTileUrl: () => `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=439d4b804bc8187953eb36d2a8c26a02`,
    opacity: 0.6,
    legend: { min: 'Clear', max: '100%', label: 'Cloud Cover', gradient: 'linear-gradient(90deg, rgba(255,255,255,0.1), rgba(148,163,184,0.8))' }
  },
  {
    id: 'wind',
    name: 'Wind',
    icon: '💨',
    color: '#4ade80',
    getTileUrl: () => `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=439d4b804bc8187953eb36d2a8c26a02`,
    opacity: 0.7,
    legend: { min: '0', max: '100 km/h', label: 'Wind Speed', gradient: 'linear-gradient(90deg,#1e3a5f,#3b82f6,#10b981,#eab308,#ef4444,#7c3aed)' }
  },
  {
    id: 'temp',
    name: 'Temp',
    icon: '🌡',
    color: '#f97316',
    getTileUrl: () => `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=439d4b804bc8187953eb36d2a8c26a02`,
    opacity: 0.6,
    legend: { min: '-40°C', max: '+40°C', label: 'Temperature', gradient: 'linear-gradient(90deg,#7c3aed,#3b82f6,#06b6d4,#10b981,#eab308,#f97316,#ef4444)' }
  },
]

const activeLegend = computed(() => {
  const ov = overlays.find(o => o.id === activeOverlay.value)
  return ov?.legend ?? { min: '', max: '', label: '', gradient: '' }
})

// ─── Init map ─────────────────────────────────────────────────────
onMounted(async () => {
  L = (await import('leaflet')).default
  await import('leaflet/dist/leaflet.css')

  // Fix icon paths
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })

  map = L.map(mapEl.value!, {
    center: [20, 10],
    zoom: 3,
    zoomControl: false,
    attributionControl: true,
  })

  // Dark base tile
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map)

  L.control.zoom({ position: 'bottomright' }).addTo(map)

  // Events
  map.on('click', (e: any) => handleMapClick(e.latlng.lat, e.latlng.lng))
  map.on('mousemove', (e: any) => { cursorCoords.value = { lat: e.latlng.lat, lng: e.latlng.lng } })
  map.on('mouseout', () => { cursorCoords.value = null })
})

onUnmounted(() => {
  map?.remove()
  miniMap?.remove()
})

// ─── Map click ────────────────────────────────────────────────────
async function handleMapClick(lat: number, lng: number) {
  loadingClick.value = true
  pendingCoords.value = { lat, lng }
  clickedWeather.value = null
  clickForecast.value = []

  // Remove old marker
  if (clickMarker) map.removeLayer(clickMarker)

  // Ripple marker
  const rippleIcon = L.divIcon({
    html: `<div class="ripple-wrap"><div class="ripple-ring r1"></div><div class="ripple-ring r2"></div><div class="ripple-ring r3"></div><div class="ripple-core"></div></div>`,
    className: '',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  })
  clickMarker = L.marker([lat, lng], { icon: rippleIcon }).addTo(map)

  try {
    // Reverse geocode
    const [nomRes] = await Promise.all([
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`),
      fetch(`https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lng}`)
        .catch(() => ({ ok: false }))
    ])
    const nom = await nomRes.json()
    const cityName = nom.address?.city || nom.address?.town || nom.address?.village || nom.address?.county || nom.name || 'Unknown'
    const country  = nom.address?.country || nom.address?.country_code?.toUpperCase() || ''

    // Get timezone from geocoding fallback
    const geoTz = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`)
    const geoTzData = await geoTz.json()
    const tz = geoTzData.results?.[0]?.timezone || 'UTC'

    // Fetch current weather + forecast
    const wRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,visibility,is_day,uv_index` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset` +
      `&timezone=${encodeURIComponent(tz)}&forecast_days=6&wind_speed_unit=kmh`
    )
    const wData = await wRes.json()
    const cur   = wData.current
    const daily = wData.daily
    const info  = wmoToInfo(cur.weather_code, cur.is_day)
    const dirs  = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']

    clickedWeather.value = {
      city: cityName, country, lat, lon: lng,
      temp: Math.round(cur.temperature_2m),
      feels_like: Math.round(cur.apparent_temperature),
      humidity: cur.relative_humidity_2m,
      wind_speed: Math.round(cur.wind_speed_10m),
      wind_dir: dirs[Math.round(cur.wind_direction_10m / 22.5) % 16],
      wind_deg: cur.wind_direction_10m,
      description: info.description,
      icon: info.icon,
      condition: info.condition,
      visibility: Math.round((cur.visibility || 10000) / 1000),
      pressure: Math.round(cur.surface_pressure),
      sunrise: daily.sunrise?.[0]?.slice(11, 16) || '--:--',
      sunset:  daily.sunset?.[0]?.slice(11, 16)  || '--:--',
      uv: Math.round(cur.uv_index || 0),
      is_day: cur.is_day,
    }

    // 5-day forecast
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    clickForecast.value = daily.time.slice(0, 5).map((date: string, i: number) => {
      const di = wmoToInfo(daily.weather_code[i], 1)
      return {
        date,
        day: i === 0 ? 'Today' : dayNames[new Date(date + 'T12:00:00').getDay()],
        high: Math.round(daily.temperature_2m_max[i]),
        low:  Math.round(daily.temperature_2m_min[i]),
        icon: di.icon, condition: di.condition,
      }
    })

    // Replace ripple with weather pin
    map.removeLayer(clickMarker)
    const acc = getTheme(info.condition, cur.is_day).accent
    const pinIcon = L.divIcon({
      html: `<div class="wx-pin" style="--a:${acc}">
               <div class="wx-bubble">
                 <span class="wx-em">${iconToEmoji(info.icon)}</span>
                 <span class="wx-t">${Math.round(cur.temperature_2m)}°</span>
               </div>
               <div class="wx-stem"></div>
               <div class="wx-shadow"></div>
             </div>`,
      className: '',
      iconSize: [76, 60],
      iconAnchor: [38, 60],
    })
    clickMarker = L.marker([lat, lng], { icon: pinIcon }).addTo(map)

    // Init mini map after sidebar renders
    await nextTick()
    setTimeout(() => initMiniMap(lat, lng, acc), 80)

  } catch (e) {
    console.error(e)
  } finally {
    loadingClick.value = false
    pendingCoords.value = null
  }
}

// ─── Mini map ─────────────────────────────────────────────────────
function initMiniMap(lat: number, lng: number, accent: string) {
  if (!miniMapEl.value || !L) return

  if (miniMap) {
    miniMap.remove()
    miniMap = null
  }

  miniMap = L.map(miniMapEl.value, {
    center: [lat, lng],
    zoom: 10,
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    touchZoom: false,
    doubleClickZoom: false,
    keyboard: false,
  })

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(miniMap)

  // Active overlay on mini map too
  if (activeOverlay.value) {
    const ov = overlays.find(o => o.id === activeOverlay.value)
    if (ov) {
      L.tileLayer(ov.getTileUrl(), { opacity: ov.opacity }).addTo(miniMap)
    }
  }

  // Custom pin on mini map
  const miniPin = L.divIcon({
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${accent};box-shadow:0 0 0 3px ${accent}44,0 0 12px ${accent}66;"></div>`,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
  L.marker([lat, lng], { icon: miniPin }).addTo(miniMap)

  // Force size recalculate
  setTimeout(() => miniMap?.invalidateSize(), 150)
}

// ─── Overlay toggle ───────────────────────────────────────────────
function toggleOverlay(id: string) {
  if (activeOverlay.value === id) {
    activeOverlay.value = null
    if (overlayLayer) { map?.removeLayer(overlayLayer); overlayLayer = null }
  } else {
    activeOverlay.value = id
    if (overlayLayer) { map?.removeLayer(overlayLayer); overlayLayer = null }
    const ov = overlays.find(o => o.id === id)
    if (ov && map && L) {
      overlayLayer = L.tileLayer(ov.getTileUrl(), { opacity: ov.opacity, zIndex: 400 }).addTo(map)
    }
  }
}

// ─── Close panel ─────────────────────────────────────────────────
function closePanel() {
  clickedWeather.value = null
  if (clickMarker) { map?.removeLayer(clickMarker); clickMarker = null }
  if (miniMap) { miniMap.remove(); miniMap = null }
}
</script>

<style>
/* ── Global marker styles ─────────────────── */
.ripple-wrap { position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; }
.ripple-ring { position: absolute; border-radius: 50%; border: 2px solid #38bdf8; }
.r1 { width: 48px; height: 48px; animation: ripple 1.6s ease-out infinite; }
.r2 { width: 48px; height: 48px; animation: ripple 1.6s ease-out 0.4s infinite; }
.r3 { width: 48px; height: 48px; animation: ripple 1.6s ease-out 0.8s infinite; }
.ripple-core { width: 12px; height: 12px; border-radius: 50%; background: #38bdf8; box-shadow: 0 0 12px #38bdf8; position: absolute; }
@keyframes ripple { 0% { transform: scale(0.3); opacity: 1; } 100% { transform: scale(2.2); opacity: 0; } }

.wx-pin { display: flex; flex-direction: column; align-items: center; }
.wx-bubble {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 12px;
  background: rgba(8, 12, 28, 0.95);
  border: 1.5px solid var(--a, #38bdf8);
  border-radius: 14px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.6), 0 0 24px color-mix(in srgb, var(--a, #38bdf8) 30%, transparent);
  backdrop-filter: blur(12px);
  animation: pinPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
}
@keyframes pinPop {
  from { transform: scale(0.4) translateY(20px); opacity: 0; }
  to   { transform: scale(1) translateY(0); opacity: 1; }
}
.wx-em { font-size: 20px; line-height: 1; }
.wx-t  { font-size: 15px; font-weight: 800; color: #fff; font-family: 'Outfit', sans-serif; }
.wx-stem { width: 2px; height: 10px; background: var(--a, #38bdf8); }
.wx-shadow { width: 10px; height: 4px; background: rgba(0,0,0,0.3); border-radius: 50%; filter: blur(2px); }

/* Leaflet overrides */
.leaflet-popup-content-wrapper {
  background: rgba(8,12,28,0.96) !important;
  border: 1px solid rgba(255,255,255,0.12) !important;
  border-radius: 14px !important;
  color: #fff !important;
  font-family: 'Outfit', sans-serif !important;
  box-shadow: 0 8px 40px rgba(0,0,0,0.6) !important;
}
.leaflet-popup-tip { background: rgba(8,12,28,0.96) !important; }
.leaflet-popup-close-button { color: rgba(255,255,255,0.4) !important; }
.leaflet-control-zoom a {
  background: rgba(8,12,28,0.9) !important;
  color: rgba(255,255,255,0.7) !important;
  border-color: rgba(255,255,255,0.1) !important;
  backdrop-filter: blur(12px) !important;
  font-size: 16px !important;
}
.leaflet-control-zoom a:hover { background: rgba(255,255,255,0.12) !important; color: #fff !important; }
.leaflet-control-attribution { background: rgba(0,0,0,0.4) !important; color: rgba(255,255,255,0.3) !important; font-size: 9px !important; }
.leaflet-control-attribution a { color: rgba(255,255,255,0.4) !important; }
</style>

<style scoped>
/* ── Core layout ──────────────────────────── */
.map-page { position: relative; width: 100vw; height: 100vh; overflow: hidden; background: #080c1c; }
.leaflet-map { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; }

/* ── Floating header ──────────────────────── */
.floating-header {
  position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
  z-index: 500; display: flex; align-items: center; gap: 16px;
  padding: 10px 20px; border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.1);
  backdrop-filter: blur(20px);
  background: rgba(8,12,28,0.85);
  white-space: nowrap;
}
.back-btn {
  width: 32px; height: 32px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.6); text-decoration: none;
  border: 1px solid rgba(255,255,255,0.1); transition: all 0.2s;
  flex-shrink: 0;
}
.back-btn:hover { color: #fff; border-color: rgba(255,255,255,0.25); }
.header-brand { display: flex; align-items: center; gap: 8px; }
.header-logo { font-size: 20px; }
.header-title { font-size: 12px; font-weight: 800; letter-spacing: 0.15em; color: #fff; }
.header-sub { font-size: 9px; color: rgba(255,255,255,0.3); margin-top: 1px; }

/* ── Overlay panel ────────────────────────── */
.overlay-panel {
  position: absolute; top: 80px; left: 16px; z-index: 500;
  padding: 14px; border-radius: 18px; min-width: 160px;
  background: rgba(8,12,28,0.88);
  border: 1px solid rgba(255,255,255,0.1);
  backdrop-filter: blur(20px);
}
.overlay-title {
  font-size: 9px; font-weight: 700; letter-spacing: 0.15em;
  color: rgba(255,255,255,0.3); margin-bottom: 10px;
}
.overlay-list { display: flex; flex-direction: column; gap: 4px; }
.ov-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.04);
  cursor: pointer; color: rgba(255,255,255,0.5);
  font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 500;
  transition: all 0.2s; text-align: left; width: 100%;
}
.ov-btn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }
.ov-icon { font-size: 16px; width: 22px; text-align: center; }
.ov-name { flex: 1; }
.ov-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

.ov-legend { margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08); }
.legend-bar { height: 6px; border-radius: 3px; margin-bottom: 5px; }
.legend-labels { display: flex; justify-content: space-between; font-size: 9px; color: rgba(255,255,255,0.35); }
.legend-labels span:nth-child(2) { color: rgba(255,255,255,0.5); font-weight: 600; }

.legend-fade-enter-active, .legend-fade-leave-active { transition: opacity 0.25s, transform 0.25s; }
.legend-fade-enter-from, .legend-fade-leave-to { opacity: 0; transform: translateY(-6px); }

/* ── Coords ───────────────────────────────── */
.coords-pill {
  position: absolute; bottom: 42px; left: 50%; transform: translateX(-50%);
  z-index: 500; padding: 5px 14px; border-radius: 20px;
  font-size: 11px; font-family: 'Space Mono', monospace;
  color: rgba(255,255,255,0.4); pointer-events: none;
  background: rgba(8,12,28,0.8); border: 1px solid rgba(255,255,255,0.08);
  white-space: nowrap;
}

/* ── Loading ──────────────────────────────── */
.loading-overlay {
  position: absolute; inset: 0; z-index: 600;
  display: flex; align-items: center; justify-content: center;
  pointer-events: none;
}
.loading-card {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 24px 32px; border-radius: 20px;
  background: rgba(8,12,28,0.92); border: 1px solid rgba(255,255,255,0.1);
  pointer-events: auto;
}
.loading-rings { position: relative; width: 48px; height: 48px; }
.ring {
  position: absolute; inset: 0; border-radius: 50%;
  border: 2px solid transparent;
  animation: spin 1.2s linear infinite;
}
.ring-1 { border-top-color: #38bdf8; }
.ring-2 { border-right-color: #818cf8; animation-delay: -0.4s; inset: 6px; }
.ring-3 { border-bottom-color: #4ade80; animation-delay: -0.8s; inset: 12px; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 13px; color: rgba(255,255,255,0.7); font-weight: 500; }
.loading-coords { font-size: 10px; color: rgba(255,255,255,0.35); font-family: 'Space Mono', monospace; }

/* ── Weather sidebar ──────────────────────── */
.weather-sidebar {
  position: absolute; top: 0; right: 0; bottom: 0;
  width: 320px; z-index: 500;
  background: rgba(8,12,28,0.92);
  border-left: 1px solid rgba(255,255,255,0.1);
  backdrop-filter: blur(24px);
  display: flex; flex-direction: column; gap: 0;
  overflow-y: auto; overflow-x: hidden;
  padding: 24px 20px 32px;
  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent;
}
@media (max-width: 640px) {
  .weather-sidebar {
    left: 0; right: 0; top: auto; width: 100%;
    max-height: 70vh; border-radius: 24px 24px 0 0;
    border-left: none; border-top: 1px solid rgba(255,255,255,0.12);
  }
}
.sidebar-close {
  position: absolute; top: 16px; right: 16px;
  width: 28px; height: 28px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.06); cursor: pointer;
  color: rgba(255,255,255,0.5); display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; flex-shrink: 0;
}
.sidebar-close:hover { color: #fff; background: rgba(255,255,255,0.12); }

.sb-location { margin-bottom: 16px; padding-top: 4px; }
.sb-city { font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -0.02em; line-height: 1.1; }
.sb-country { font-size: 12px; color: rgba(255,255,255,0.45); margin-top: 3px; }
.sb-coords-tag {
  display: inline-flex; margin-top: 6px;
  padding: 3px 10px; border-radius: 20px;
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
  font-size: 10px; font-family: 'Space Mono', monospace; color: rgba(255,255,255,0.4);
}

.sb-hero { margin-bottom: 20px; }
.sb-temp-wrap { display: flex; align-items: flex-start; gap: 4px; margin-bottom: 6px; line-height: 1; }
.sb-temp { font-size: 80px; font-weight: 900; color: #fff; letter-spacing: -0.04em; line-height: 0.9; }
.sb-temp-right { display: flex; flex-direction: column; padding-top: 10px; gap: 2px; }
.sb-unit { font-size: 26px; font-weight: 300; color: rgba(255,255,255,0.45); }
.sb-emoji { font-size: 34px; }
.sb-desc { font-size: 14px; color: rgba(255,255,255,0.65); text-transform: capitalize; }
.sb-feels { font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 3px; }

.sb-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; }
.sb-stat {
  padding: 12px; border-radius: 14px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.07);
}
.sb-stat-icon { font-size: 16px; margin-bottom: 4px; }
.sb-stat-val { font-size: 14px; font-weight: 700; color: #fff; line-height: 1.2; }
.sb-stat-label { font-size: 9px; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px; }

/* ── Mini map ─────────────────────────────── */
.minimap-wrap {
  position: relative; margin-bottom: 20px;
  border-radius: 16px; overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
  height: 140px;
}
.minimap { width: 100%; height: 100%; }
.minimap-label {
  position: absolute; top: 8px; left: 10px; z-index: 10;
  font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
  color: rgba(255,255,255,0.5);
  background: rgba(8,12,28,0.7);
  padding: 2px 8px; border-radius: 6px;
  backdrop-filter: blur(8px);
}
.minimap-pin {
  position: absolute; bottom: 8px; right: 10px; z-index: 10;
  font-size: 18px; pointer-events: none;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8));
}

/* ── Forecast strip ───────────────────────── */
.sb-forecast { margin-bottom: 20px; }
.sb-forecast-label {
  font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
  color: rgba(255,255,255,0.3); margin-bottom: 10px;
}
.sb-forecast-row { display: flex; gap: 4px; }
.sb-fc-item {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  padding: 10px 4px; border-radius: 12px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
  gap: 3px;
}
.sb-fc-day { font-size: 9px; color: rgba(255,255,255,0.4); font-weight: 600; }
.sb-fc-emoji { font-size: 18px; }
.sb-fc-hi { font-size: 12px; font-weight: 700; color: #fff; }
.sb-fc-lo { font-size: 10px; color: rgba(255,255,255,0.35); }

/* ── Full forecast btn ────────────────────── */
.sb-full-btn {
  display: block; width: 100%; padding: 12px;
  border-radius: 12px; text-align: center;
  font-size: 13px; font-weight: 700; color: #000;
  text-decoration: none; transition: opacity 0.2s, transform 0.15s;
  letter-spacing: 0.01em;
}
.sb-full-btn:hover { opacity: 0.88; transform: translateY(-1px); }

/* ── Hint pill ────────────────────────────── */
.hint-pill {
  position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%);
  z-index: 500; padding: 10px 20px; border-radius: 20px;
  display: flex; align-items: center; gap: 10px;
  font-size: 13px; color: rgba(255,255,255,0.6);
  background: rgba(8,12,28,0.85); border: 1px solid rgba(255,255,255,0.1);
  white-space: nowrap; pointer-events: none;
}
.hint-pulse {
  width: 8px; height: 8px; border-radius: 50; border-radius: 50%;
  animation: hintPulse 1.5s ease-in-out infinite;
}
@keyframes hintPulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.7); } }

/* ── Transitions ──────────────────────────── */
.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.3s; }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(100%); opacity: 0; }
@media (max-width: 640px) {
  .slide-right-enter-from, .slide-right-leave-to { transform: translateY(100%); opacity: 0; }
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.glass { backdrop-filter: blur(20px); }
.glass-hover { transition: all 0.2s; }
.glass-hover:hover { background: rgba(255,255,255,0.08); }
</style>
