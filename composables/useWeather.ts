import { ref } from 'vue'

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
  description: string
  icon: string
  condition: string
  visibility: number
  pressure: number
  sunrise: string
  sunset: string
  uv: number
  is_day: number
}

export interface ForecastDay {
  date: string
  day: string
  high: number
  low: number
  icon: string
  condition: string
  chance_of_rain: number
}

export interface HourlyData {
  time: string
  hour: number
  temp: number
  icon: string
  condition: string
  precip: number
}

const CACHE: Record<string, { data: any; ts: number }> = {}
const CACHE_TTL = 10 * 60 * 1000

export function wmoToInfo(code: number, isDay: number): { description: string; condition: string; icon: string } {
  if (code === 0) return { description: isDay ? 'Clear sky' : 'Clear night', condition: 'Clear', icon: isDay ? '01d' : '01n' }
  if (code === 1) return { description: 'Mainly clear', condition: 'Clear', icon: isDay ? '01d' : '01n' }
  if (code === 2) return { description: 'Partly cloudy', condition: 'Clouds', icon: isDay ? '02d' : '02n' }
  if (code === 3) return { description: 'Overcast', condition: 'Clouds', icon: '04d' }
  if (code <= 49) return { description: 'Foggy', condition: 'Mist', icon: '50d' }
  if (code <= 59) return { description: 'Drizzle', condition: 'Drizzle', icon: '09d' }
  if (code <= 69) return { description: 'Rain', condition: 'Rain', icon: '10d' }
  if (code <= 79) return { description: 'Snow', condition: 'Snow', icon: '13d' }
  if (code <= 84) return { description: 'Rain showers', condition: 'Rain', icon: '09d' }
  if (code <= 94) return { description: 'Snow showers', condition: 'Snow', icon: '13d' }
  return { description: 'Thunderstorm', condition: 'Thunderstorm', icon: '11d' }
}

function getWindDir(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  return dirs[Math.round(deg / 22.5) % 16]
}

export function iconToEmoji(icon: string): string {
  if (icon.includes('01')) return icon.includes('d') ? '☀️' : '🌙'
  if (icon.includes('02')) return '⛅'
  if (icon.includes('03') || icon.includes('04')) return '☁️'
  if (icon.includes('09') || icon.includes('10')) return '🌧️'
  if (icon.includes('11')) return '⛈️'
  if (icon.includes('13')) return '❄️'
  if (icon.includes('50')) return '🌫️'
  return '🌡️'
}

export function getTheme(condition: string, isDay: number): {
  bg: string; accent: string; particle: string; cardBg: string; textColor: string
} {
  const c = condition?.toLowerCase() || ''
  if (c.includes('thunder')) return {
    bg: 'from-[#0d0d1a] via-[#1a0a2e] to-[#0d1117]',
    accent: '#a855f7', particle: 'purple', cardBg: 'rgba(88,28,135,0.15)', textColor: '#e9d5ff'
  }
  if (c.includes('snow')) return {
    bg: 'from-[#0f1f3d] via-[#1e3a5f] to-[#0d2137]',
    accent: '#93c5fd', particle: 'blue', cardBg: 'rgba(96,165,250,0.12)', textColor: '#dbeafe'
  }
  if (c.includes('rain') || c.includes('drizzle')) return {
    bg: 'from-[#0a0f1a] via-[#111827] to-[#0f172a]',
    accent: '#38bdf8', particle: 'cyan', cardBg: 'rgba(56,189,248,0.1)', textColor: '#bae6fd'
  }
  if (c.includes('cloud') || c.includes('mist') || c.includes('fog')) return {
    bg: 'from-[#111827] via-[#1f2937] to-[#111827]',
    accent: '#94a3b8', particle: 'gray', cardBg: 'rgba(148,163,184,0.1)', textColor: '#cbd5e1'
  }
  if (!isDay) return {
    bg: 'from-[#020817] via-[#0f172a] to-[#020617]',
    accent: '#818cf8', particle: 'indigo', cardBg: 'rgba(99,102,241,0.12)', textColor: '#c7d2fe'
  }
  // Clear day
  return {
    bg: 'from-[#0c1445] via-[#1e3a8a] to-[#0c2461]',
    accent: '#f59e0b', particle: 'amber', cardBg: 'rgba(245,158,11,0.1)', textColor: '#fef3c7'
  }
}

export function uvInfo(uv: number): { label: string; color: string } {
  if (uv <= 2) return { label: 'Low', color: '#4ade80' }
  if (uv <= 5) return { label: 'Moderate', color: '#facc15' }
  if (uv <= 7) return { label: 'High', color: '#fb923c' }
  if (uv <= 10) return { label: 'Very High', color: '#f87171' }
  return { label: 'Extreme', color: '#c084fc' }
}

const weather = ref<WeatherData | null>(null)
const forecast = ref<ForecastDay[]>([])
const hourly = ref<HourlyData[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useWeather() {
  async function fetchWeather(city: string) {
    if (!city.trim()) return
    const cacheKey = city.toLowerCase().trim()
    const cached = CACHE[cacheKey]
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      applyData(cached.data); return
    }
    loading.value = true
    error.value = null
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
      )
      const geoData = await geoRes.json()
      if (!geoData.results?.length) throw new Error(`City "${city}" not found.`)
      const { latitude, longitude, name, country, timezone, country_code } = geoData.results[0]
      await fetchByLatLon(latitude, longitude, name, country || country_code || '', timezone, cacheKey)
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch weather.'
    } finally {
      loading.value = false
    }
  }

  async function fetchByCoords(lat: number, lon: number) {
    loading.value = true
    error.value = null
    try {
      const nomRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
      const nomData = await nomRes.json()
      const cityName = nomData.address?.city || nomData.address?.town || nomData.address?.village || 'Your Location'
      const country = nomData.address?.country || ''
      const tzRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`)
      const tzData = await tzRes.json()
      const tz = tzData.results?.[0]?.timezone || 'auto'
      await fetchByLatLon(lat, lon, cityName, country, tz, `${lat},${lon}`)
    } catch (e: any) {
      error.value = 'Could not detect location.'
    } finally {
      loading.value = false
    }
  }

  async function fetchByLatLon(lat: number, lon: number, name: string, country: string, timezone: string, cacheKey: string) {
    const wRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,visibility,is_day,uv_index` +
      `&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max` +
      `&timezone=${encodeURIComponent(timezone)}&forecast_days=7&wind_speed_unit=kmh`
    )
    const wData = await wRes.json()
    const combo = { wData, name, country, lat, lon }
    CACHE[cacheKey] = { data: combo, ts: Date.now() }
    applyData(combo)
  }

  function applyData({ wData, name, country, lat, lon }: any) {
    const cur = wData.current
    const daily = wData.daily
    const h = wData.hourly
    const info = wmoToInfo(cur.weather_code, cur.is_day)

    weather.value = {
      city: name, country, lat, lon,
      temp: Math.round(cur.temperature_2m),
      feels_like: Math.round(cur.apparent_temperature),
      humidity: cur.relative_humidity_2m,
      wind_speed: Math.round(cur.wind_speed_10m),
      wind_dir: getWindDir(cur.wind_direction_10m),
      wind_deg: cur.wind_direction_10m,
      description: info.description,
      icon: info.icon,
      condition: info.condition,
      visibility: Math.round((cur.visibility || 10000) / 1000),
      pressure: Math.round(cur.surface_pressure),
      sunrise: daily.sunrise[0]?.slice(11, 16) || '--:--',
      sunset: daily.sunset[0]?.slice(11, 16) || '--:--',
      uv: Math.round(cur.uv_index || 0),
      is_day: cur.is_day,
    }

    const nowHour = new Date().getHours()
    const startIdx = h.time.findIndex((t: string) => parseInt(t.slice(11, 13)) >= nowHour)
    hourly.value = Array.from({ length: 8 }, (_, i) => {
      const idx = (startIdx >= 0 ? startIdx : 0) + i * 3
      if (idx >= h.time.length) return null
      const t = h.time[idx]
      const hr = parseInt(t.slice(11, 13))
      const isDay = hr >= 6 && hr < 20 ? 1 : 0
      const hInfo = wmoToInfo(h.weather_code[idx], isDay)
      return {
        time: t.slice(11, 16),
        hour: hr,
        temp: Math.round(h.temperature_2m[idx]),
        icon: hInfo.icon,
        condition: hInfo.condition,
        precip: h.precipitation_probability[idx] || 0,
      }
    }).filter(Boolean) as HourlyData[]

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    forecast.value = daily.time.slice(0, 6).map((date: string, i: number) => {
      const dInfo = wmoToInfo(daily.weather_code[i], 1)
      return {
        date, day: i === 0 ? 'Today' : dayNames[new Date(date + 'T12:00:00').getDay()],
        high: Math.round(daily.temperature_2m_max[i]),
        low: Math.round(daily.temperature_2m_min[i]),
        icon: dInfo.icon, condition: dInfo.condition,
        chance_of_rain: daily.precipitation_probability_max[i] || 0,
      }
    })
  }

  return { weather, forecast, hourly, loading, error, fetchWeather, fetchByCoords }
}
