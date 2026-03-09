import { ref } from 'vue'

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface WeatherData {
  city: string
  country: string
  lat: number
  lon: number
  temp: number
  feels_like: number
  humidity: number
  wind_speed: number
  wind_dir: string
  wind_deg: number
  wind_gust: number
  description: string
  icon: string
  condition: string
  visibility: number
  pressure: number
  sunrise: string
  sunset: string
  uv: number
  is_day: number
  dew_point: number
  precipitation_mm: number
  cloud_cover: number
  timezone: string
}

export interface ForecastDay {
  date: string
  day: string
  high: number
  low: number
  icon: string
  condition: string
  chance_of_rain: number
  precipitation_mm: number
  uv_max: number
  sunrise: string
  sunset: string
}

export interface HourlyData {
  time: string
  hour: number
  temp: number
  feels_like: number
  icon: string
  condition: string
  precip: number
  wind_speed: number
  humidity: number
}

export interface AirQualityData {
  aqi: number
  label: string
  color: string
  pm2_5: number
  pm10: number
  ozone: number
  no2: number
  co: number
}

// ─────────────────────────────────────────────────────────────────
// Cache — 10 min TTL, keyed by city name or lat,lon string
// ─────────────────────────────────────────────────────────────────

const CACHE: Record<string, { data: any; ts: number }> = {}
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

function getCached(key: string) {
  const entry = CACHE[key]
  return entry && Date.now() - entry.ts < CACHE_TTL ? entry.data : null
}
function setCache(key: string, data: any) {
  CACHE[key] = { data, ts: Date.now() }
}

// ─────────────────────────────────────────────────────────────────
// WMO weather code → human-readable info
// ─────────────────────────────────────────────────────────────────

export function wmoToInfo(code: number, isDay: number): {
  description: string; condition: string; icon: string
} {
  const d = isDay ? 'd' : 'n'
  if (code === 0)  return { description: isDay ? 'Clear sky' : 'Clear night', condition: 'Clear',       icon: `01${d}` }
  if (code === 1)  return { description: 'Mainly clear',    condition: 'Clear',       icon: `01${d}` }
  if (code === 2)  return { description: 'Partly cloudy',   condition: 'Clouds',      icon: `02${d}` }
  if (code === 3)  return { description: 'Overcast',        condition: 'Clouds',      icon: '04d' }
  if (code <= 49)  return { description: 'Foggy',           condition: 'Mist',        icon: '50d' }
  if (code === 51) return { description: 'Light drizzle',   condition: 'Drizzle',     icon: '09d' }
  if (code === 53) return { description: 'Drizzle',         condition: 'Drizzle',     icon: '09d' }
  if (code === 55) return { description: 'Heavy drizzle',   condition: 'Drizzle',     icon: '09d' }
  if (code <= 59)  return { description: 'Freezing drizzle',condition: 'Drizzle',     icon: '09d' }
  if (code === 61) return { description: 'Light rain',      condition: 'Rain',        icon: '10d' }
  if (code === 63) return { description: 'Moderate rain',   condition: 'Rain',        icon: '10d' }
  if (code === 65) return { description: 'Heavy rain',      condition: 'Rain',        icon: '10d' }
  if (code <= 69)  return { description: 'Freezing rain',   condition: 'Rain',        icon: '13d' }
  if (code <= 79)  return { description: 'Snow',            condition: 'Snow',        icon: '13d' }
  if (code === 80) return { description: 'Light showers',   condition: 'Rain',        icon: '09d' }
  if (code === 81) return { description: 'Rain showers',    condition: 'Rain',        icon: '09d' }
  if (code === 82) return { description: 'Heavy showers',   condition: 'Rain',        icon: '09d' }
  if (code <= 84)  return { description: 'Snow showers',    condition: 'Snow',        icon: '13d' }
  if (code <= 94)  return { description: 'Snow showers',    condition: 'Snow',        icon: '13d' }
  if (code === 95) return { description: 'Thunderstorm',    condition: 'Thunderstorm',icon: '11d' }
  if (code >= 96)  return { description: 'Thunderstorm with hail', condition: 'Thunderstorm', icon: '11d' }
  return { description: 'Unknown', condition: 'Clear', icon: `01${d}` }
}

// ─────────────────────────────────────────────────────────────────
// Icon → Emoji
// ─────────────────────────────────────────────────────────────────

export function iconToEmoji(icon: string): string {
  if (icon.startsWith('01')) return icon.includes('d') ? '☀️' : '🌙'
  if (icon.startsWith('02')) return icon.includes('d') ? '⛅' : '🌙'
  if (icon.startsWith('03') || icon.startsWith('04')) return '☁️'
  if (icon.startsWith('09')) return '🌧️'
  if (icon.startsWith('10')) return '🌦️'
  if (icon.startsWith('11')) return '⛈️'
  if (icon.startsWith('13')) return '❄️'
  if (icon.startsWith('50')) return '🌫️'
  return '🌡️'
}

// ─────────────────────────────────────────────────────────────────
// Wind direction
// ─────────────────────────────────────────────────────────────────

export function getWindDir(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
  return dirs[Math.round(deg / 22.5) % 16]
}

// ─────────────────────────────────────────────────────────────────
// Theme per weather condition
// ─────────────────────────────────────────────────────────────────

export function getTheme(condition: string, isDay: number): {
  bg: string; accent: string; particle: string; cardBg: string; textColor: string
} {
  const c = (condition || '').toLowerCase()
  if (c.includes('thunder'))
    return { bg: 'from-[#0d0d1a]',   accent: '#a855f7', particle: 'purple', cardBg: 'rgba(88,28,135,0.15)',   textColor: '#e9d5ff' }
  if (c.includes('snow'))
    return { bg: 'from-[#0f1f3d]',   accent: '#93c5fd', particle: 'blue',   cardBg: 'rgba(96,165,250,0.12)',  textColor: '#dbeafe' }
  if (c.includes('rain') || c.includes('drizzle'))
    return { bg: 'from-[#0a0f1a]',   accent: '#38bdf8', particle: 'cyan',   cardBg: 'rgba(56,189,248,0.1)',   textColor: '#bae6fd' }
  if (c.includes('cloud') || c.includes('mist') || c.includes('fog'))
    return { bg: 'from-[#111827]',   accent: '#94a3b8', particle: 'gray',   cardBg: 'rgba(148,163,184,0.1)',  textColor: '#cbd5e1' }
  if (!isDay)
    return { bg: 'from-[#020817]',   accent: '#818cf8', particle: 'indigo', cardBg: 'rgba(99,102,241,0.12)',  textColor: '#c7d2fe' }
  // Clear day
  return   { bg: 'from-[#0c1445]',   accent: '#f59e0b', particle: 'amber',  cardBg: 'rgba(245,158,11,0.1)',   textColor: '#fef3c7' }
}

// ─────────────────────────────────────────────────────────────────
// UV index info
// ─────────────────────────────────────────────────────────────────

export function uvInfo(uv: number): { label: string; color: string; advice: string } {
  if (uv <= 2)  return { label: 'Low',       color: '#4ade80', advice: 'No protection needed' }
  if (uv <= 5)  return { label: 'Moderate',  color: '#facc15', advice: 'SPF 30+ recommended' }
  if (uv <= 7)  return { label: 'High',      color: '#fb923c', advice: 'SPF 50+, limit midday' }
  if (uv <= 10) return { label: 'Very High', color: '#f87171', advice: 'Avoid sun 10am–4pm' }
  return              { label: 'Extreme',    color: '#c084fc', advice: 'Stay indoors midday' }
}

// ─────────────────────────────────────────────────────────────────
// Air quality index info
// ─────────────────────────────────────────────────────────────────

export function aqiInfo(aqi: number): { label: string; color: string; advice: string } {
  if (aqi <= 20)  return { label: 'Good',       color: '#4ade80', advice: 'Air quality is excellent' }
  if (aqi <= 40)  return { label: 'Fair',       color: '#a3e635', advice: 'Air quality is acceptable' }
  if (aqi <= 60)  return { label: 'Moderate',   color: '#facc15', advice: 'Sensitive groups take care' }
  if (aqi <= 80)  return { label: 'Poor',       color: '#fb923c', advice: 'Reduce outdoor activity' }
  if (aqi <= 100) return { label: 'Very Poor',  color: '#f87171', advice: 'Avoid outdoor activity' }
  return               { label: 'Hazardous',   color: '#c084fc', advice: 'Stay indoors' }
}

// ─────────────────────────────────────────────────────────────────
// Beaufort scale for wind
// ─────────────────────────────────────────────────────────────────

export function beaufortScale(kmh: number): { scale: number; label: string } {
  if (kmh < 1)   return { scale: 0, label: 'Calm' }
  if (kmh < 6)   return { scale: 1, label: 'Light air' }
  if (kmh < 12)  return { scale: 2, label: 'Light breeze' }
  if (kmh < 20)  return { scale: 3, label: 'Gentle breeze' }
  if (kmh < 29)  return { scale: 4, label: 'Moderate breeze' }
  if (kmh < 39)  return { scale: 5, label: 'Fresh breeze' }
  if (kmh < 50)  return { scale: 6, label: 'Strong breeze' }
  if (kmh < 62)  return { scale: 7, label: 'Near gale' }
  if (kmh < 75)  return { scale: 8, label: 'Gale' }
  if (kmh < 89)  return { scale: 9, label: 'Strong gale' }
  if (kmh < 103) return { scale: 10, label: 'Storm' }
  if (kmh < 118) return { scale: 11, label: 'Violent storm' }
  return              { scale: 12, label: 'Hurricane' }
}

// ─────────────────────────────────────────────────────────────────
// Feels-like description
// ─────────────────────────────────────────────────────────────────

export function feelsLikeDesc(actual: number, feels: number): string {
  const diff = feels - actual
  if (diff > 4)  return 'Feels hotter than it is'
  if (diff > 1)  return 'Feels slightly warm'
  if (diff < -4) return 'Feels much colder'
  if (diff < -1) return 'Feels slightly cooler'
  return 'Feels about right'
}

// ─────────────────────────────────────────────────────────────────
// Fetch with abort-controller timeout
// ─────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, ms = 12000): Promise<Response> {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    return res
  } finally {
    clearTimeout(id)
  }
}

// ─────────────────────────────────────────────────────────────────
// Shared reactive state (module-level singleton)
// ─────────────────────────────────────────────────────────────────

const weather    = ref<WeatherData | null>(null)
const forecast   = ref<ForecastDay[]>([])
const hourly     = ref<HourlyData[]>([])
const airQuality = ref<AirQualityData | null>(null)
const loading    = ref(false)
const error      = ref<string | null>(null)
const lastCity   = ref<string>('')
const lastFetchTime = ref<number>(0)

// ─────────────────────────────────────────────────────────────────
// Main composable
// ─────────────────────────────────────────────────────────────────

export function useWeather() {

  // ── Fetch by city name ──────────────────────────────────────────
  async function fetchWeather(city: string) {
    if (!city.trim()) return
    const key = city.toLowerCase().trim()

    const cached = getCached(key)
    if (cached) { applyData(cached); return }

    loading.value = true
    error.value   = null
    try {
      const geoRes  = await fetchWithTimeout(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
      )
      const geoData = await geoRes.json()
      if (!geoData.results?.length) throw new Error(`City "${city}" not found.`)
      const { latitude, longitude, name, country, timezone, country_code } = geoData.results[0]
      await fetchByLatLon(latitude, longitude, name, country || country_code || '', timezone, key)
    } catch (e: any) {
      if (e.name === 'AbortError') error.value = 'Request timed out. Check your connection.'
      else error.value = e.message || 'Failed to fetch weather.'
    } finally {
      loading.value = false
    }
  }

  // ── Fetch by GPS coordinates ────────────────────────────────────
  async function fetchByCoords(lat: number, lon: number) {
    const key = `${lat.toFixed(3)},${lon.toFixed(3)}`
    const cached = getCached(key)
    if (cached) { applyData(cached); return }

    loading.value = true
    error.value   = null
    try {
      const nomRes  = await fetchWithTimeout(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`
      )
      if (!nomRes.ok) throw new Error('Could not reverse geocode location.')
      const nomData = await nomRes.json()

      const cityName = nomData.address?.city
        || nomData.address?.town
        || nomData.address?.village
        || nomData.address?.county
        || nomData.name
        || 'Your Location'
      const country = nomData.address?.country || nomData.address?.country_code?.toUpperCase() || ''

      const tzRes  = await fetchWithTimeout(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`
      )
      const tzData = await tzRes.json()
      const tz = tzData.results?.[0]?.timezone || 'auto'

      await fetchByLatLon(lat, lon, cityName, country, tz, key)
    } catch (e: any) {
      if (e.name === 'AbortError') error.value = 'Location request timed out.'
      else error.value = e.message || 'Could not detect location.'
    } finally {
      loading.value = false
    }
  }

  // ── Core data fetcher ───────────────────────────────────────────
  async function fetchByLatLon(
    lat: number, lon: number,
    name: string, country: string,
    timezone: string, cacheKey: string
  ) {
    // Weather + Air Quality in parallel
    const [wRes, aqRes] = await Promise.allSettled([
      fetchWithTimeout(
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,` +
        `wind_speed_10m,wind_gusts_10m,wind_direction_10m,surface_pressure,visibility,` +
        `is_day,uv_index,dew_point_2m,precipitation,cloud_cover` +
        `&hourly=temperature_2m,apparent_temperature,weather_code,precipitation_probability,wind_speed_10m,relative_humidity_2m` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,` +
        `precipitation_sum,sunrise,sunset,uv_index_max` +
        `&timezone=${encodeURIComponent(timezone)}&forecast_days=7&wind_speed_unit=kmh`
      ),
      fetchWithTimeout(
        `https://air-quality-api.open-meteo.com/v1/air-quality` +
        `?latitude=${lat}&longitude=${lon}` +
        `&current=european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone`
      ),
    ])

    if (wRes.status === 'rejected') throw new Error('Weather API unavailable.')
    if (!wRes.value.ok) throw new Error(`Weather API error: ${wRes.value.status}`)

    const wData = await wRes.value.json()

    // Air quality (optional — don't fail if unavailable)
    let aqData: any = null
    if (aqRes.status === 'fulfilled' && aqRes.value.ok) {
      aqData = await aqRes.value.json()
    }

    const combo = { wData, aqData, name, country, lat, lon, timezone }
    setCache(cacheKey, combo)
    applyData(combo)
  }

  // ── Apply fetched data to reactive refs ─────────────────────────
  function applyData({ wData, aqData, name, country, lat, lon, timezone }: any) {
    const cur   = wData.current
    const daily = wData.daily
    const h     = wData.hourly
    const info  = wmoToInfo(cur.weather_code, cur.is_day)

    // ── Current weather ─────────────────────────────────────────
    weather.value = {
      city:             name,
      country:          country,
      lat:              lat,
      lon:              lon,
      temp:             Math.round(cur.temperature_2m),
      feels_like:       Math.round(cur.apparent_temperature),
      humidity:         cur.relative_humidity_2m,
      wind_speed:       Math.round(cur.wind_speed_10m),
      wind_gust:        Math.round(cur.wind_gusts_10m ?? cur.wind_speed_10m),
      wind_dir:         getWindDir(cur.wind_direction_10m),
      wind_deg:         cur.wind_direction_10m,
      description:      info.description,
      icon:             info.icon,
      condition:        info.condition,
      visibility:       Math.round((cur.visibility ?? 10000) / 1000),
      pressure:         Math.round(cur.surface_pressure),
      sunrise:          daily.sunrise[0]?.slice(11, 16) ?? '--:--',
      sunset:           daily.sunset[0]?.slice(11, 16)  ?? '--:--',
      uv:               Math.round(cur.uv_index ?? 0),
      is_day:           cur.is_day,
      dew_point:        Math.round(cur.dew_point_2m ?? cur.temperature_2m - 5),
      precipitation_mm: Math.round((cur.precipitation ?? 0) * 10) / 10,
      cloud_cover:      cur.cloud_cover ?? 0,
      timezone:         timezone,
    }

    lastCity.value      = name
    lastFetchTime.value = Date.now()

    // ── Hourly — next 24h at 3-hour intervals ───────────────────
    const nowHour  = new Date().getHours()
    const startIdx = h.time.findIndex((t: string) => parseInt(t.slice(11, 13)) >= nowHour)
    hourly.value = Array.from({ length: 8 }, (_, i) => {
      const idx = (startIdx >= 0 ? startIdx : 0) + i * 3
      if (idx >= h.time.length) return null
      const t   = h.time[idx]
      const hr  = parseInt(t.slice(11, 13))
      const isD = hr >= 6 && hr < 20 ? 1 : 0
      const hi  = wmoToInfo(h.weather_code[idx], isD)
      return {
        time:       t.slice(11, 16),
        hour:       hr,
        temp:       Math.round(h.temperature_2m[idx]),
        feels_like: Math.round(h.apparent_temperature?.[idx] ?? h.temperature_2m[idx]),
        icon:       hi.icon,
        condition:  hi.condition,
        precip:     h.precipitation_probability[idx] ?? 0,
        wind_speed: Math.round(h.wind_speed_10m?.[idx] ?? 0),
        humidity:   h.relative_humidity_2m?.[idx] ?? 0,
      } as HourlyData
    }).filter(Boolean) as HourlyData[]

    // ── 6-day forecast ──────────────────────────────────────────
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    forecast.value = daily.time.slice(0, 6).map((date: string, i: number) => {
      const di = wmoToInfo(daily.weather_code[i], 1)
      return {
        date,
        day:              i === 0 ? 'Today' : dayNames[new Date(date + 'T12:00:00').getDay()],
        high:             Math.round(daily.temperature_2m_max[i]),
        low:              Math.round(daily.temperature_2m_min[i]),
        icon:             di.icon,
        condition:        di.condition,
        chance_of_rain:   daily.precipitation_probability_max[i] ?? 0,
        precipitation_mm: Math.round((daily.precipitation_sum?.[i] ?? 0) * 10) / 10,
        uv_max:           Math.round(daily.uv_index_max?.[i] ?? 0),
        sunrise:          daily.sunrise[i]?.slice(11, 16) ?? '--:--',
        sunset:           daily.sunset[i]?.slice(11, 16)  ?? '--:--',
      } as ForecastDay
    })

    // ── Air quality ─────────────────────────────────────────────
    if (aqData?.current) {
      const c   = aqData.current
      const aqi = c.european_aqi ?? 0
      const info = aqiInfo(aqi)
      airQuality.value = {
        aqi,
        label:  info.label,
        color:  info.color,
        pm2_5:  Math.round(c.pm2_5    ?? 0),
        pm10:   Math.round(c.pm10     ?? 0),
        ozone:  Math.round(c.ozone    ?? 0),
        no2:    Math.round(c.nitrogen_dioxide ?? 0),
        co:     Math.round((c.carbon_monoxide ?? 0) / 100) / 10,
      }
    } else {
      airQuality.value = null
    }
  }

  // ── Refresh (bypass cache) ──────────────────────────────────────
  async function refresh() {
    if (!lastCity.value) return
    // Invalidate cache entry
    const key = lastCity.value.toLowerCase().trim()
    delete CACHE[key]
    await fetchWeather(lastCity.value)
  }

  // ── Clear state ─────────────────────────────────────────────────
  function clearWeather() {
    weather.value    = null
    forecast.value   = []
    hourly.value     = []
    airQuality.value = null
    error.value      = null
    lastCity.value   = ''
  }

  return {
    weather,
    forecast,
    hourly,
    airQuality,
    loading,
    error,
    lastCity,
    lastFetchTime,
    fetchWeather,
    fetchByCoords,
    refresh,
    clearWeather,
  }
}