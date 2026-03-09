<template>
  <div class="map-page">

    <!-- ── FULL-SCREEN MAP ─────────────────────── -->
    <div ref="mapEl" class="leaflet-map"></div>

    <!-- ── FLOATING HEADER ────────────────────── -->
    <div class="floating-header glass">
      <NuxtLink to="/" class="back-btn glass-hover" aria-label="Back to home">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
      </NuxtLink>
      <div class="header-brand">
        <span class="header-logo">🌤</span>
        <div>
          <div class="header-title">MAP EXPLORER</div>
          <div class="header-sub">Thailand Weather · Real-time</div>
        </div>
      </div>
      <div class="header-search glass-inner">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          v-model="headerSearch"
          type="text"
          placeholder="Search province..."
          class="header-search-input"
          @keydown.enter="searchProvince"
          @keydown.esc="headerSearch = ''"
          aria-label="Search for a province"
        />
        <button v-if="headerSearch" class="header-search-clear" @click="headerSearch = ''" aria-label="Clear">×</button>
      </div>
      <NavBar />
    </div>

    <!-- ── LAYERS PANEL ────────────────────────── -->
    <div class="overlay-panel glass">
      <div class="overlay-title">LAYERS</div>
      <div class="overlay-list">
        <button
          v-for="ov in overlays" :key="ov.id"
          class="ov-btn"
          :class="{ 'ov-active': activeOverlay === ov.id }"
          :style="activeOverlay === ov.id ? { background: ov.color + '25', borderColor: ov.color + '90', color: '#fff' } : {}"
          @click="toggleOverlay(ov.id)"
          :aria-label="`Toggle ${ov.name} layer`"
          :aria-pressed="activeOverlay === ov.id"
        >
          <span class="ov-icon">{{ ov.icon }}</span>
          <span class="ov-name">{{ ov.name }}</span>
          <span v-if="activeOverlay === ov.id" class="ov-dot" :style="{ background: ov.color }" />
        </button>
      </div>
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

    <!-- ── MAP STYLE PANEL ─────────────────────── -->
    <div class="map-style-panel glass">
      <div class="overlay-title">MAP STYLE</div>
      <div class="style-list">
        <button
          v-for="s in mapStyles" :key="s.id"
          class="style-btn"
          :class="{ 'style-active': activeMapStyle === s.id }"
          @click="switchMapStyle(s.id)"
        >
          <span class="style-preview" :style="{ background: s.preview }"></span>
          <span class="style-name">{{ s.name }}</span>
        </button>
      </div>
    </div>

    <!-- ── THAILAND PROVINCE PANEL ─────────────── -->
    <div class="province-panel glass">
      <div class="province-panel-header">
        <div class="panel-title">🇹🇭 PROVINCES</div>
        <button class="panel-toggle" @click="showProvinceList = !showProvinceList">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path :d="showProvinceList ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'"/>
          </svg>
        </button>
      </div>

      <template v-if="showProvinceList">
        <!-- Region tabs -->
        <div class="region-tabs">
          <button
            v-for="r in regions" :key="r.id"
            class="region-tab"
            :class="{ 'region-tab-active': activeRegion === r.id }"
            :style="activeRegion === r.id ? { borderColor: r.color + '90', color: r.color, background: r.color + '18' } : {}"
            @click="activeRegion = activeRegion === r.id ? 'all' : r.id"
          >{{ r.short }}</button>
        </div>

        <!-- Filter input -->
        <div class="province-search-wrap">
          <input v-model="provinceFilter" type="text" placeholder="Filter provinces..." class="province-filter-input" />
        </div>

        <!-- List -->
        <div class="province-list">
          <button
            v-for="p in filteredProvinces" :key="p.id"
            class="province-item"
            :class="{ 'province-active': selectedProvince?.id === p.id }"
            :style="selectedProvince?.id === p.id ? { background: regionColor(p.region) + '18', borderColor: regionColor(p.region) + '60' } : {}"
            @click="jumpToProvince(p)"
          >
            <span class="prov-dot-sm" :style="{ background: regionColor(p.region) }"></span>
            <div class="prov-names">
              <span class="prov-name-en">{{ p.name }}</span>
              <span class="prov-name-th">{{ p.nameTh }}</span>
            </div>
            <span v-if="provinceTempCache[p.id] !== undefined" class="prov-cached-temp">
              {{ tempUnit === 'F' ? Math.round(provinceTempCache[p.id] * 9/5 + 32) : provinceTempCache[p.id] }}°
            </span>
            <svg v-else width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" class="prov-arrow">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      </template>
    </div>

    <!-- ── CURSOR COORDS ───────────────────────── -->
    <div v-if="cursorCoords" class="coords-pill glass">
      {{ cursorCoords.lat.toFixed(3) }}°, {{ cursorCoords.lng.toFixed(3) }}°
    </div>

    <!-- ── LOADING ────────────────────────────── -->
    <transition name="fade">
      <div v-if="loadingClick" class="loading-overlay">
        <div class="loading-card glass">
          <div class="loading-rings">
            <div class="ring ring-1"/><div class="ring ring-2"/><div class="ring ring-3"/>
          </div>
          <div class="loading-text">Fetching weather...</div>
          <div class="loading-coords">{{ pendingCoords?.lat.toFixed(2) }}°, {{ pendingCoords?.lng.toFixed(2) }}°</div>
        </div>
      </div>
    </transition>

    <!-- ── WEATHER SIDEBAR ────────────────────── -->
    <transition name="slide-left">
      <div v-if="clickedWeather" class="weather-sidebar glass" :style="{ '--acc': accentColor }">

        <button class="sidebar-close glass-hover" @click="closePanel" aria-label="Close">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        <button class="sidebar-share glass-hover" @click="shareLocation" aria-label="Share">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>

        <div class="sb-location">
          <div class="sb-city">{{ clickedWeather.city }}</div>
          <div class="sb-country">{{ clickedWeather.country }}</div>
          <div class="sb-coords-tag">{{ clickedWeather.lat.toFixed(3) }}°, {{ clickedWeather.lon.toFixed(3) }}°</div>
          <div v-if="matchedProvince" class="sb-province-tag" :style="{ borderColor: regionColor(matchedProvince.region) + '70', color: regionColor(matchedProvince.region) }">
            <span class="prov-dot-sm" :style="{ background: regionColor(matchedProvince.region) }"></span>
            {{ matchedProvince.region }} · Thailand
          </div>
        </div>

        <div class="sb-hero">
          <div class="sb-temp-wrap">
            <div class="sb-temp">{{ displayTemp(clickedWeather.temp) }}</div>
            <div class="sb-temp-right">
              <span class="sb-unit">°{{ tempUnit }}</span>
              <span class="sb-emoji">{{ iconToEmoji(clickedWeather.icon) }}</span>
            </div>
          </div>
          <div class="sb-desc">{{ clickedWeather.description }}</div>
          <div class="sb-feels">Feels like {{ displayTemp(clickedWeather.feels_like) }}°{{ tempUnit }}</div>
          <div class="unit-toggle">
            <button :class="['unit-btn', tempUnit === 'C' ? 'unit-active' : '']" @click="tempUnit = 'C'">°C</button>
            <button :class="['unit-btn', tempUnit === 'F' ? 'unit-active' : '']" @click="tempUnit = 'F'">°F</button>
          </div>
        </div>

        <div class="sb-stats">
          <div class="sb-stat" v-for="s in sidebarStats" :key="s.label">
            <div class="sb-stat-icon">{{ s.icon }}</div>
            <div class="sb-stat-val">{{ s.value }}</div>
            <div class="sb-stat-label">{{ s.label }}</div>
          </div>
        </div>

        <div v-if="airQuality" class="sb-aqi glass-inner">
          <div class="aqi-header">
            <span class="aqi-label">AIR QUALITY</span>
            <span class="aqi-badge" :style="{ background: airQuality.color+'30', color: airQuality.color, borderColor: airQuality.color+'60' }">{{ airQuality.label }}</span>
          </div>
          <div class="aqi-bar-wrap">
            <div class="aqi-bar-bg"/>
            <div class="aqi-bar-fill" :style="{ width: ((5 - airQuality.index) / 5 * 100) + '%' }"/>
          </div>
          <div class="aqi-metrics">
            <div v-for="m in airQuality.metrics" :key="m.name" class="aqi-metric">
              <span class="aqi-metric-name">{{ m.name }}</span>
              <span class="aqi-metric-val">{{ m.value }}</span>
            </div>
          </div>
        </div>

        <div class="minimap-wrap">
          <div class="minimap-label">LOCATION</div>
          <div ref="miniMapEl" class="minimap"></div>
          <div class="minimap-pin">📍</div>
        </div>

        <div class="sb-forecast" v-if="clickForecast.length">
          <div class="sb-forecast-label">5-DAY OUTLOOK</div>
          <div class="sb-forecast-row">
            <div v-for="d in clickForecast" :key="d.date" class="sb-fc-item">
              <div class="sb-fc-day">{{ d.day }}</div>
              <div class="sb-fc-emoji">{{ iconToEmoji(d.icon) }}</div>
              <div class="sb-fc-hi">{{ displayTemp(d.high) }}°</div>
              <div class="sb-fc-lo">{{ displayTemp(d.low) }}°</div>
            </div>
          </div>
        </div>

        <NuxtLink :to="`/?city=${encodeURIComponent(clickedWeather.city)}`" class="sb-full-btn" :style="{ background: accentColor }">
          Full Forecast & Hourly →
        </NuxtLink>
      </div>
    </transition>

    <!-- ── HINT ────────────────────────────────── -->
    <transition name="fade">
      <div v-if="!clickedWeather && !loadingClick && !errorMessage" class="hint-pill glass">
        <span class="hint-pulse"/>
        Click map or select a province from the list →
      </div>
    </transition>

    <transition name="fade">
      <div v-if="errorMessage" class="hint-pill error-pill glass" role="alert">⚠ {{ errorMessage }}</div>
    </transition>

    <transition name="toast-pop">
      <div v-if="toastMessage" class="toast-pill glass" role="status">{{ toastMessage }}</div>
    </transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { iconToEmoji, getTheme, wmoToInfo } from '~/composables/useWeather'
import type { WeatherData } from '~/composables/useWeather'

type ForecastDay  = { date: string; day: string; high: number; low: number; icon: string; condition: string }
type AirQuality   = { index: number; label: string; color: string; metrics: { name: string; value: string }[] }
type Province     = typeof THAILAND_PROVINCES[0]

// ─── All 77 Thai provinces ────────────────────────────────────────
const THAILAND_PROVINCES = [
  // Central
  { id: 'bangkok',          name: 'Bangkok',           nameTh: 'กรุงเทพฯ',          region: 'Central',   lat: 13.7563,  lng: 100.5018 },
  { id: 'nonthaburi',       name: 'Nonthaburi',        nameTh: 'นนทบุรี',            region: 'Central',   lat: 13.8621,  lng: 100.5144 },
  { id: 'pathumthani',      name: 'Pathum Thani',      nameTh: 'ปทุมธานี',           region: 'Central',   lat: 14.0208,  lng: 100.5250 },
  { id: 'ayutthaya',        name: 'Ayutthaya',         nameTh: 'อยุธยา',             region: 'Central',   lat: 14.3692,  lng: 100.5877 },
  { id: 'saraburi',         name: 'Saraburi',          nameTh: 'สระบุรี',            region: 'Central',   lat: 14.5289,  lng: 100.9101 },
  { id: 'lopburi',          name: 'Lopburi',           nameTh: 'ลพบุรี',             region: 'Central',   lat: 14.7995,  lng: 100.6534 },
  { id: 'singburi',         name: 'Sing Buri',         nameTh: 'สิงห์บุรี',          region: 'Central',   lat: 14.8936,  lng: 100.3967 },
  { id: 'angthong',         name: 'Ang Thong',         nameTh: 'อ่างทอง',            region: 'Central',   lat: 14.5896,  lng: 100.4550 },
  { id: 'chainat',          name: 'Chai Nat',          nameTh: 'ชัยนาท',             region: 'Central',   lat: 15.1851,  lng: 100.1244 },
  { id: 'nakornpathom',     name: 'Nakhon Pathom',     nameTh: 'นครปฐม',             region: 'Central',   lat: 13.8196,  lng: 100.0430 },
  { id: 'suphanburi',       name: 'Suphan Buri',       nameTh: 'สุพรรณบุรี',         region: 'Central',   lat: 14.4744,  lng: 100.1177 },
  { id: 'samutprakan',      name: 'Samut Prakan',      nameTh: 'สมุทรปราการ',        region: 'Central',   lat: 13.5990,  lng: 100.5998 },
  { id: 'samutsakhon',      name: 'Samut Sakhon',      nameTh: 'สมุทรสาคร',          region: 'Central',   lat: 13.5475,  lng: 100.2747 },
  { id: 'samutsongkhram',   name: 'Samut Songkhram',   nameTh: 'สมุทรสงคราม',        region: 'Central',   lat: 13.4098,  lng: 100.0022 },
  { id: 'ratchaburi',       name: 'Ratchaburi',        nameTh: 'ราชบุรี',            region: 'Central',   lat: 13.5360,  lng: 99.8178  },
  { id: 'kanchanaburi',     name: 'Kanchanaburi',      nameTh: 'กาญจนบุรี',          region: 'Central',   lat: 14.0023,  lng: 99.5328  },
  // North
  { id: 'chiangmai',        name: 'Chiang Mai',        nameTh: 'เชียงใหม่',          region: 'North',     lat: 18.7883,  lng: 98.9853  },
  { id: 'chiangrai',        name: 'Chiang Rai',        nameTh: 'เชียงราย',           region: 'North',     lat: 19.9105,  lng: 99.8406  },
  { id: 'maehongson',       name: 'Mae Hong Son',      nameTh: 'แม่ฮ่องสอน',         region: 'North',     lat: 19.3020,  lng: 97.9654  },
  { id: 'phayao',           name: 'Phayao',            nameTh: 'พะเยา',              region: 'North',     lat: 19.2154,  lng: 99.8838  },
  { id: 'nan',              name: 'Nan',               nameTh: 'น่าน',               region: 'North',     lat: 18.7756,  lng: 100.7730 },
  { id: 'phrae',            name: 'Phrae',             nameTh: 'แพร่',               region: 'North',     lat: 18.1445,  lng: 100.1408 },
  { id: 'lampang',          name: 'Lampang',           nameTh: 'ลำปาง',              region: 'North',     lat: 18.2888,  lng: 99.4900  },
  { id: 'lamphun',          name: 'Lamphun',           nameTh: 'ลำพูน',              region: 'North',     lat: 18.5744,  lng: 99.0087  },
  { id: 'uttaradit',        name: 'Uttaradit',         nameTh: 'อุตรดิตถ์',          region: 'North',     lat: 17.6200,  lng: 100.0993 },
  { id: 'sukhothai',        name: 'Sukhothai',         nameTh: 'สุโขทัย',            region: 'North',     lat: 17.0069,  lng: 99.8265  },
  { id: 'kamphaengphet',    name: 'Kamphaeng Phet',    nameTh: 'กำแพงเพชร',          region: 'North',     lat: 16.4827,  lng: 99.5224  },
  { id: 'tak',              name: 'Tak',               nameTh: 'ตาก',                region: 'North',     lat: 16.8798,  lng: 99.1259  },
  { id: 'phitsanulok',      name: 'Phitsanulok',       nameTh: 'พิษณุโลก',           region: 'North',     lat: 16.8211,  lng: 100.2659 },
  { id: 'phichit',          name: 'Phichit',           nameTh: 'พิจิตร',             region: 'North',     lat: 16.4432,  lng: 100.3487 },
  { id: 'phetchabun',       name: 'Phetchabun',        nameTh: 'เพชรบูรณ์',          region: 'North',     lat: 16.4189,  lng: 101.1600 },
  // Northeast (Isan)
  { id: 'khonkaen',         name: 'Khon Kaen',         nameTh: 'ขอนแก่น',            region: 'Northeast', lat: 16.4419,  lng: 102.8360 },
  { id: 'udornthani',       name: 'Udon Thani',        nameTh: 'อุดรธานี',           region: 'Northeast', lat: 17.4138,  lng: 102.7872 },
  { id: 'nongkhai',         name: 'Nong Khai',         nameTh: 'หนองคาย',            region: 'Northeast', lat: 17.8782,  lng: 102.7412 },
  { id: 'loei',             name: 'Loei',              nameTh: 'เลย',                region: 'Northeast', lat: 17.4860,  lng: 101.7223 },
  { id: 'sakonnakhon',      name: 'Sakon Nakhon',      nameTh: 'สกลนคร',             region: 'Northeast', lat: 17.1665,  lng: 104.1486 },
  { id: 'nakhonphanom',     name: 'Nakhon Phanom',     nameTh: 'นครพนม',             region: 'Northeast', lat: 17.3922,  lng: 104.7694 },
  { id: 'mukdahan',         name: 'Mukdahan',          nameTh: 'มุกดาหาร',           region: 'Northeast', lat: 16.5425,  lng: 104.7238 },
  { id: 'amnatcharoen',     name: 'Amnat Charoen',     nameTh: 'อำนาจเจริญ',         region: 'Northeast', lat: 15.8656,  lng: 104.6257 },
  { id: 'ubonratchathani',  name: 'Ubon Ratchathani',  nameTh: 'อุบลราชธานี',        region: 'Northeast', lat: 15.2287,  lng: 104.8577 },
  { id: 'sisaket',          name: 'Si Sa Ket',         nameTh: 'ศรีสะเกษ',           region: 'Northeast', lat: 15.1186,  lng: 104.3220 },
  { id: 'surin',            name: 'Surin',             nameTh: 'สุรินทร์',           region: 'Northeast', lat: 14.8818,  lng: 103.4936 },
  { id: 'buriram',          name: 'Buri Ram',          nameTh: 'บุรีรัมย์',          region: 'Northeast', lat: 14.9929,  lng: 103.1029 },
  { id: 'nakhonratchasima', name: 'Nakhon Ratchasima', nameTh: 'นครราชสีมา',         region: 'Northeast', lat: 14.9799,  lng: 102.0977 },
  { id: 'chaiyaphum',       name: 'Chaiyaphum',        nameTh: 'ชัยภูมิ',            region: 'Northeast', lat: 15.8068,  lng: 102.0317 },
  { id: 'mahasarakham',     name: 'Maha Sarakham',     nameTh: 'มหาสารคาม',          region: 'Northeast', lat: 16.0132,  lng: 103.1615 },
  { id: 'roiset',           name: 'Roi Et',            nameTh: 'ร้อยเอ็ด',           region: 'Northeast', lat: 16.0543,  lng: 103.6520 },
  { id: 'kalasin',          name: 'Kalasin',           nameTh: 'กาฬสินธุ์',          region: 'Northeast', lat: 16.4315,  lng: 103.5059 },
  { id: 'nongbualamphu',    name: 'Nong Bua Lam Phu',  nameTh: 'หนองบัวลำภู',        region: 'Northeast', lat: 17.2018,  lng: 102.4260 },
  { id: 'buengkan',         name: 'Bueng Kan',         nameTh: 'บึงกาฬ',             region: 'Northeast', lat: 18.3609,  lng: 103.6466 },
  // East
  { id: 'chonburi',         name: 'Chon Buri',         nameTh: 'ชลบุรี',             region: 'East',      lat: 13.3611,  lng: 100.9847 },
  { id: 'rayong',           name: 'Rayong',            nameTh: 'ระยอง',              region: 'East',      lat: 12.6814,  lng: 101.2816 },
  { id: 'chanthaburi',      name: 'Chanthaburi',       nameTh: 'จันทบุรี',           region: 'East',      lat: 12.6098,  lng: 102.1034 },
  { id: 'trat',             name: 'Trat',              nameTh: 'ตราด',               region: 'East',      lat: 12.2428,  lng: 102.5139 },
  { id: 'prachinburi',      name: 'Prachin Buri',      nameTh: 'ปราจีนบุรี',         region: 'East',      lat: 14.0579,  lng: 101.3689 },
  { id: 'sakeaw',           name: 'Sa Kaeo',           nameTh: 'สระแก้ว',            region: 'East',      lat: 13.8240,  lng: 102.0640 },
  { id: 'nakhonnayok',      name: 'Nakhon Nayok',      nameTh: 'นครนายก',            region: 'East',      lat: 14.2069,  lng: 101.2131 },
  { id: 'chachoengsao',     name: 'Chachoengsao',      nameTh: 'ฉะเชิงเทรา',         region: 'East',      lat: 13.6904,  lng: 101.0779 },
  // West
  { id: 'phetchaburi',      name: 'Phetchaburi',       nameTh: 'เพชรบุรี',           region: 'West',      lat: 13.1119,  lng: 99.9399  },
  { id: 'prachuapkhirikhan',name: 'Prachuap Khiri Khan',nameTh: 'ประจวบคีรีขันธ์',   region: 'West',      lat: 11.8126,  lng: 99.7957  },
  // South
  { id: 'chumphon',         name: 'Chumphon',          nameTh: 'ชุมพร',              region: 'South',     lat: 10.4930,  lng: 99.1800  },
  { id: 'ranong',           name: 'Ranong',            nameTh: 'ระนอง',              region: 'South',     lat: 9.9529,   lng: 98.6084  },
  { id: 'suratthani',       name: 'Surat Thani',       nameTh: 'สุราษฎร์ธานี',       region: 'South',     lat: 9.1382,   lng: 99.3214  },
  { id: 'phangnga',         name: 'Phang Nga',         nameTh: 'พังงา',              region: 'South',     lat: 8.4509,   lng: 98.5253  },
  { id: 'phuket',           name: 'Phuket',            nameTh: 'ภูเก็ต',             region: 'South',     lat: 7.8804,   lng: 98.3923  },
  { id: 'krabi',            name: 'Krabi',             nameTh: 'กระบี่',             region: 'South',     lat: 8.0863,   lng: 98.9063  },
  { id: 'nakhonsi',         name: 'Nakhon Si Thammarat',nameTh: 'นครศรีธรรมราช',     region: 'South',     lat: 8.4322,   lng: 99.9633  },
  { id: 'trang',            name: 'Trang',             nameTh: 'ตรัง',               region: 'South',     lat: 7.5591,   lng: 99.6114  },
  { id: 'phatthalung',      name: 'Phatthalung',       nameTh: 'พัทลุง',             region: 'South',     lat: 7.6166,   lng: 100.0740 },
  { id: 'satun',            name: 'Satun',             nameTh: 'สตูล',               region: 'South',     lat: 6.6238,   lng: 100.0674 },
  { id: 'songkhla',         name: 'Songkhla',          nameTh: 'สงขลา',              region: 'South',     lat: 7.1897,   lng: 100.5953 },
  { id: 'pattani',          name: 'Pattani',           nameTh: 'ปัตตานี',            region: 'South',     lat: 6.8697,   lng: 101.2508 },
  { id: 'yala',             name: 'Yala',              nameTh: 'ยะลา',               region: 'South',     lat: 6.5413,   lng: 101.2803 },
  { id: 'narathiwat',       name: 'Narathiwat',        nameTh: 'นราธิวาส',           region: 'South',     lat: 6.4255,   lng: 101.8253 },
]

const regions = [
  { id: 'Central',   short: 'Central', color: '#38bdf8' },
  { id: 'North',     short: 'North',   color: '#4ade80' },
  { id: 'Northeast', short: 'Isan',    color: '#f97316' },
  { id: 'East',      short: 'East',    color: '#a78bfa' },
  { id: 'West',      short: 'West',    color: '#fb923c' },
  { id: 'South',     short: 'South',   color: '#34d399' },
]
function regionColor(r: string) { return regions.find(x => x.id === r)?.color ?? '#888' }

// ─── State ────────────────────────────────────────────────────────
const mapEl             = ref<HTMLElement|null>(null)
const miniMapEl         = ref<HTMLElement|null>(null)
const loadingClick      = ref(false)
const clickedWeather    = ref<WeatherData|null>(null)
const clickForecast     = ref<ForecastDay[]>([])
const cursorCoords      = ref<{lat:number;lng:number}|null>(null)
const pendingCoords     = ref<{lat:number;lng:number}|null>(null)
const activeOverlay     = ref<string|null>(null)
const activeMapStyle    = ref('dark')
const errorMessage      = ref('')
const toastMessage      = ref('')
const tempUnit          = ref<'C'|'F'>('C')
const headerSearch      = ref('')
const airQuality        = ref<AirQuality|null>(null)
const showProvinceList  = ref(true)
const activeRegion      = ref('all')
const provinceFilter    = ref('')
const selectedProvince  = ref<Province|null>(null)
const provinceTempCache = ref<Record<string,number>>({})

const matchedProvince = computed(() => {
  if (!clickedWeather.value) return null
  let best: Province|null = null; let min = Infinity
  for (const p of THAILAND_PROVINCES) {
    const d = Math.hypot(p.lat - clickedWeather.value.lat, p.lng - clickedWeather.value.lon)
    if (d < min) { min = d; best = p }
  }
  return min < 1.5 ? best : null
})

const filteredProvinces = computed(() => {
  let list = THAILAND_PROVINCES
  if (activeRegion.value !== 'all') list = list.filter(p => p.region === activeRegion.value)
  const q = provinceFilter.value.trim().toLowerCase()
  if (q) list = list.filter(p => p.name.toLowerCase().includes(q) || p.nameTh.includes(q))
  return list
})

let L: any = null, map: any = null, miniMap: any = null
let tileLayer: any = null, clickMarker: any = null, overlayLayer: any = null
let clickTimeout: number|null = null, errorTimer: number|null = null, toastTimer: number|null = null

function displayTemp(c: number) { return tempUnit.value === 'F' ? Math.round(c * 9/5 + 32) : c }
const accentColor = computed(() => getTheme(clickedWeather.value?.condition||'Clear', clickedWeather.value?.is_day??1).accent)
const sidebarStats = computed(() => {
  const w = clickedWeather.value; if (!w) return []
  return [
    { icon:'💧', label:'Humidity',   value: w.humidity+'%' },
    { icon:'💨', label:'Wind',       value: w.wind_speed+' km/h '+w.wind_dir },
    { icon:'👁',  label:'Visibility', value: w.visibility+' km' },
    { icon:'📊', label:'Pressure',   value: w.pressure+' hPa' },
    { icon:'🌅', label:'Sunrise',    value: w.sunrise },
    { icon:'🌇', label:'Sunset',     value: w.sunset },
  ]
})

// ─── Map styles ──────────────────────────────────────────────────
const mapStyles = [
  { id:'dark',      name:'Dark',      preview:'linear-gradient(135deg,#1a1a2e,#16213e)', url:'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' },
  { id:'light',     name:'Light',     preview:'linear-gradient(135deg,#e8eaf0,#c5cbe3)', url:'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' },
  { id:'satellite', name:'Satellite', preview:'linear-gradient(135deg,#1a3a1a,#2d5a27)', url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
  { id:'terrain',   name:'Terrain',   preview:'linear-gradient(135deg,#8B7355,#6B8E23)', url:'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png' },
]
function switchMapStyle(id: string) {
  if (activeMapStyle.value === id || !map || !L) return
  activeMapStyle.value = id
  if (tileLayer) map.removeLayer(tileLayer)
  tileLayer = L.tileLayer(mapStyles.find(s=>s.id===id)!.url, { maxZoom:18 }).addTo(map)
  if (overlayLayer) overlayLayer.bringToFront()
}

// ─── Overlays ─────────────────────────────────────────────────────
// Rain uses RainViewer (free, no API key needed — always works)
// Clouds/Wind/Temp use OWM tiles — replace appid with your own free key
// from openweathermap.org if these show broken tiles.
// Get a free key at: https://home.openweathermap.org/users/sign_up
const OWM_KEY = '439d4b804bc8187953eb36d2a8c26a02' // ← replace with your key

const overlays = [
  {
    id:'precipitation', name:'Rain Radar', icon:'🌧', color:'#38bdf8',
    // RainViewer — always free, no key, global coverage
    url:`https://tilecache.rainviewer.com/v2/coverage/0/512/{z}/{x}/{y}/4/1_1.png`,
    opacity:0.75,
    legend:{ min:'None', max:'Heavy', label:'Precipitation', gradient:'linear-gradient(90deg,#1e3a5f,#3b82f6,#06b6d4,#10b981,#84cc16,#eab308,#f97316,#ef4444)' }
  },
  {
    id:'clouds', name:'Clouds', icon:'☁️', color:'#94a3b8',
    url:`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`,
    opacity:0.55,
    legend:{ min:'Clear', max:'100%', label:'Cloud Cover', gradient:'linear-gradient(90deg,rgba(255,255,255,0.05),rgba(148,163,184,0.8))' }
  },
  {
    id:'wind', name:'Wind', icon:'💨', color:'#4ade80',
    url:`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`,
    opacity:0.7,
    legend:{ min:'0', max:'100 km/h', label:'Wind Speed', gradient:'linear-gradient(90deg,#1e3a5f,#3b82f6,#10b981,#eab308,#ef4444,#7c3aed)' }
  },
  {
    id:'temp', name:'Temp', icon:'🌡', color:'#f97316',
    url:`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`,
    opacity:0.6,
    legend:{ min:'-40°C', max:'+40°C', label:'Temperature', gradient:'linear-gradient(90deg,#7c3aed,#3b82f6,#06b6d4,#10b981,#eab308,#f97316,#ef4444)' }
  },
]
const activeLegend = computed(() => overlays.find(o=>o.id===activeOverlay.value)?.legend ?? { min:'',max:'',label:'',gradient:'' })

function toggleOverlay(id: string) {
  if (activeOverlay.value === id) {
    activeOverlay.value = null
    if (overlayLayer) { map?.removeLayer(overlayLayer); overlayLayer = null }
    return
  }
  activeOverlay.value = id
  if (overlayLayer) { map?.removeLayer(overlayLayer); overlayLayer = null }
  const ov = overlays.find(o=>o.id===id)
  if (!ov || !map || !L) return
  overlayLayer = L.tileLayer(ov.url, {
    opacity: ov.opacity,
    zIndex: 400,
    // Prevents broken-image tile icons on 401/429 errors
    errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
  }).addTo(map)
  overlayLayer.on('tileerror', (_e: any) => {
    if (id !== 'precipitation') {
      showError(`"${ov.name}" layer needs a valid OpenWeatherMap API key. Try "Rain Radar" instead (always free).`)
    }
  })
}

// ─── Init ─────────────────────────────────────────────────────────
onMounted(async () => {
  if (!mapEl.value) return
  L = await import('leaflet')
  await import('leaflet/dist/leaflet.css')
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })

  map = L.map(mapEl.value, { center:[13.0, 101.5], zoom:6, zoomControl:false, attributionControl:false, minZoom:5 })
  tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom:18 }).addTo(map)
  L.control.zoom({ position:'bottomright' }).addTo(map)

  drawProvinceMarkers()

  if (process.client) {
    const p = new URLSearchParams(window.location.search)
    const lat = parseFloat(p.get('lat')||''), lon = parseFloat(p.get('lon')||'')
    if (!isNaN(lat) && !isNaN(lon)) setTimeout(() => handleMapClick(lat, lon), 600)
  }

  map.on('click', (e:any) => handleMapClickDebounced(e.latlng.lat, e.latlng.lng))
  map.on('mousemove', (e:any) => { cursorCoords.value = { lat:e.latlng.lat, lng:e.latlng.lng } })
  map.on('mouseout', () => { cursorCoords.value = null })
})

onUnmounted(() => {
  map?.remove(); miniMap?.remove()
  if (errorTimer) clearTimeout(errorTimer)
  if (toastTimer) clearTimeout(toastTimer)
})

// ─── Province dot markers on map ─────────────────────────────────
function drawProvinceMarkers() {
  for (const p of THAILAND_PROVINCES) {
    const c = regionColor(p.region)
    const icon = L.divIcon({
      html: `<div class="prov-dot" style="--c:${c}" title="${p.name}·${p.nameTh}"></div>`,
      className:'', iconSize:[10,10], iconAnchor:[5,5],
    })
    L.marker([p.lat, p.lng], { icon }).addTo(map).on('click', () => jumpToProvince(p))
  }
}

// ─── Jump to province ─────────────────────────────────────────────
function jumpToProvince(p: Province) {
  selectedProvince.value = p
  map?.flyTo([p.lat, p.lng], 11, { duration:1.0 })
  handleMapClickDebounced(p.lat, p.lng)
}

// ─── Header search ────────────────────────────────────────────────
function searchProvince() {
  const q = headerSearch.value.trim().toLowerCase()
  if (!q) return
  const found = THAILAND_PROVINCES.find(p => p.name.toLowerCase().includes(q) || p.nameTh.includes(q))
  if (found) { jumpToProvince(found); headerSearch.value = '' }
  else showError(`Province "${headerSearch.value}" not found in Thailand`)
}

// ─── Fetch helper ─────────────────────────────────────────────────
async function fetchWithTimeout(url:string, ms=10000): Promise<Response> {
  const c = new AbortController(); const id = setTimeout(()=>c.abort(), ms)
  try { return await fetch(url, { signal:c.signal }) } finally { clearTimeout(id) }
}

// ─── Map click / weather fetch ───────────────────────────────────
function handleMapClickDebounced(lat:number, lng:number) {
  if (clickTimeout) clearTimeout(clickTimeout)
  clickTimeout = window.setTimeout(() => handleMapClick(lat, lng), 300)
}

async function handleMapClick(lat:number, lng:number) {
  loadingClick.value = true
  pendingCoords.value = { lat, lng }
  clickedWeather.value = null; clickForecast.value = []; airQuality.value = null

  if (clickMarker) map.removeLayer(clickMarker)
  clickMarker = L.marker([lat, lng], { icon: L.divIcon({
    html:`<div class="ripple-wrap"><div class="ripple-ring r1"></div><div class="ripple-ring r2"></div><div class="ripple-ring r3"></div><div class="ripple-core"></div></div>`,
    className:'', iconSize:[48,48], iconAnchor:[24,24],
  })}).addTo(map)

  try {
    const nomRes = await fetchWithTimeout(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`)
    if (!nomRes.ok) throw new Error('Geocoding failed')
    const nom = await nomRes.json()
    const cityName = nom.address?.city || nom.address?.town || nom.address?.village || nom.address?.county || nom.name || 'Unknown'
    const country  = nom.address?.country || nom.address?.country_code?.toUpperCase() || ''

    const geoData = await (await fetchWithTimeout(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`)).json()
    const tz = geoData.results?.[0]?.timezone || 'Asia/Bangkok'

    const [wRes, aqRes] = await Promise.all([
      fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,visibility,is_day,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=${encodeURIComponent(tz)}&forecast_days=6&wind_speed_unit=kmh`),
      fetchWithTimeout(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone`).catch(()=>null),
    ])
    if (!wRes.ok) throw new Error('Weather API failed')
    const { current:cur, daily } = await wRes.json()
    if (!cur) throw new Error('No weather data')

    const info = wmoToInfo(cur.weather_code, cur.is_day)
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
    clickedWeather.value = {
      city:cityName, country, lat, lon:lng,
      temp: Math.round(cur.temperature_2m),
      feels_like: Math.round(cur.apparent_temperature),
      humidity: cur.relative_humidity_2m,
      wind_speed: Math.round(cur.wind_speed_10m),
      wind_dir: dirs[Math.round(cur.wind_direction_10m/22.5)%16],
      wind_deg: cur.wind_direction_10m,
      description: info.description, icon: info.icon, condition: info.condition,
      visibility: Math.round((cur.visibility||10000)/1000),
      pressure: Math.round(cur.surface_pressure),
      sunrise: daily?.sunrise?.[0]?.slice(11,16)||'--:--',
      sunset:  daily?.sunset?.[0]?.slice(11,16) ||'--:--',
      uv: Math.round(cur.uv_index||0), is_day: cur.is_day,
    }

    // Cache temp for province panel indicator
    const mp = matchedProvince.value
    if (mp) provinceTempCache.value = { ...provinceTempCache.value, [mp.id]: Math.round(cur.temperature_2m) }

    // Air quality
    if (aqRes?.ok) {
      const aq = await aqRes.json()
      const aqi = aq.current?.european_aqi
      if (aqi != null) {
        const lvls = [
          {max:20,label:'Good',color:'#4ade80'},{max:40,label:'Fair',color:'#a3e635'},
          {max:60,label:'Moderate',color:'#facc15'},{max:80,label:'Poor',color:'#fb923c'},
          {max:100,label:'Very Poor',color:'#f87171'},{max:Infinity,label:'Hazardous',color:'#c084fc'},
        ]
        const lv = lvls.find(l=>aqi<=l.max)!
        airQuality.value = {
          index: Math.min(Math.ceil(aqi/20),5), label:lv.label, color:lv.color,
          metrics:[
            {name:'PM2.5',value:`${Math.round(aq.current?.pm2_5??0)} μg`},
            {name:'PM10', value:`${Math.round(aq.current?.pm10??0)} μg`},
            {name:'O₃',   value:`${Math.round(aq.current?.ozone??0)} μg`},
            {name:'NO₂',  value:`${Math.round(aq.current?.nitrogen_dioxide??0)} μg`},
          ],
        }
      }
    }

    // Forecast
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    clickForecast.value = daily.time.slice(0,5).map((d:string, i:number) => {
      const di = wmoToInfo(daily.weather_code[i], 1)
      return { date:d, day:i===0?'Today':days[new Date(d+'T12:00:00').getDay()], high:Math.round(daily.temperature_2m_max[i]), low:Math.round(daily.temperature_2m_min[i]), icon:di.icon, condition:di.condition }
    })

    // Replace ripple with weather pin
    map.removeLayer(clickMarker)
    const acc = getTheme(info.condition, cur.is_day).accent
    clickMarker = L.marker([lat,lng],{ icon: L.divIcon({
      html:`<div class="wx-pin" style="--a:${acc}"><div class="wx-bubble"><span class="wx-em">${iconToEmoji(info.icon)}</span><span class="wx-t">${Math.round(cur.temperature_2m)}°</span></div><div class="wx-stem"></div><div class="wx-shadow"></div></div>`,
      className:'', iconSize:[76,60], iconAnchor:[38,60],
    })}).addTo(map)

    await nextTick()
    setTimeout(() => initMiniMap(lat, lng, acc), 80)
  } catch (e:any) {
    showError(e?.name==='AbortError' ? 'Request timed out.' : e?.message||'Unknown error')
    clickedWeather.value = null
  } finally {
    loadingClick.value = false; pendingCoords.value = null
  }
}

function initMiniMap(lat:number, lng:number, accent:string) {
  if (!miniMapEl.value || !L) return
  if (miniMap) { miniMap.setView([lat,lng]); return }
  miniMap = L.map(miniMapEl.value, { center:[lat,lng], zoom:10, zoomControl:false, attributionControl:false, dragging:false, scrollWheelZoom:false, touchZoom:false, doubleClickZoom:false, keyboard:false })
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', { subdomains:'abcd', maxZoom:18 }).addTo(miniMap)
  L.marker([lat,lng],{ icon: L.divIcon({
    html:`<div style="width:14px;height:14px;border-radius:50%;background:${accent};box-shadow:0 0 0 3px ${accent}44,0 0 10px ${accent}66;"></div>`,
    className:'', iconSize:[14,14], iconAnchor:[7,7],
  })}).addTo(miniMap)
  setTimeout(()=>miniMap?.invalidateSize(), 150)
}

function closePanel() {
  clickedWeather.value = null; airQuality.value = null; selectedProvince.value = null
  if (clickMarker) { map?.removeLayer(clickMarker); clickMarker = null }
}
function showError(msg:string) {
  errorMessage.value = msg
  if (errorTimer) clearTimeout(errorTimer)
  errorTimer = window.setTimeout(()=>{ errorMessage.value='' }, 5000)
}
function showToast(msg:string) {
  toastMessage.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = window.setTimeout(()=>{ toastMessage.value='' }, 3000)
}
async function shareLocation() {
  if (!clickedWeather.value) return
  const text = `Weather in ${clickedWeather.value.city}: ${clickedWeather.value.temp}°C, ${clickedWeather.value.description}`
  const url  = `${window.location.origin}/map?lat=${clickedWeather.value.lat}&lon=${clickedWeather.value.lon}`
  if (navigator.share) await navigator.share({ title:`${clickedWeather.value.city} Weather`, text, url }).catch(()=>{})
  else { await navigator.clipboard.writeText(`${text}\n${url}`).catch(()=>{}); showToast('📋 Copied!') }
}
</script>

<style>
.prov-dot{width:10px;height:10px;border-radius:50%;background:var(--c,#38bdf8);box-shadow:0 0 0 2px rgba(0,0,0,0.5),0 0 6px var(--c,#38bdf8);cursor:pointer;transition:transform 0.2s}
.prov-dot:hover{transform:scale(2)}
.ripple-wrap{position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center}
.ripple-ring{position:absolute;border-radius:50%;border:2px solid #38bdf8}
.r1{width:48px;height:48px;animation:ripple 1.6s ease-out infinite}
.r2{width:48px;height:48px;animation:ripple 1.6s ease-out 0.4s infinite}
.r3{width:48px;height:48px;animation:ripple 1.6s ease-out 0.8s infinite}
.ripple-core{width:12px;height:12px;border-radius:50%;background:#38bdf8;box-shadow:0 0 12px #38bdf8;position:absolute}
@keyframes ripple{0%{transform:scale(0.3);opacity:1}100%{transform:scale(2.2);opacity:0}}
.wx-pin{display:flex;flex-direction:column;align-items:center}
.wx-bubble{display:flex;align-items:center;gap:5px;padding:6px 12px;background:rgba(8,12,28,0.95);border:1.5px solid var(--a,#38bdf8);border-radius:14px;box-shadow:0 4px 24px rgba(0,0,0,0.6);backdrop-filter:blur(12px);animation:pinPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both}
@keyframes pinPop{from{transform:scale(0.4) translateY(20px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
.wx-em{font-size:20px;line-height:1}.wx-t{font-size:15px;font-weight:800;color:#fff;font-family:'Outfit',sans-serif}
.wx-stem{width:2px;height:10px;background:var(--a,#38bdf8)}.wx-shadow{width:10px;height:4px;background:rgba(0,0,0,0.3);border-radius:50%;filter:blur(2px)}
.leaflet-control-zoom a{background:rgba(8,12,28,0.9)!important;color:rgba(255,255,255,0.7)!important;border-color:rgba(255,255,255,0.1)!important;backdrop-filter:blur(12px)!important}
.leaflet-control-zoom a:hover{background:rgba(255,255,255,0.12)!important;color:#fff!important}
.leaflet-control-attribution{background:rgba(0,0,0,0.4)!important;color:rgba(255,255,255,0.3)!important;font-size:9px!important}
</style>

<style scoped>
.map-page{position:relative;width:100vw;height:100vh;overflow:hidden;background:#080c1c}
.leaflet-map{position:absolute;inset:0;width:100%;height:100%;z-index:1}

/* ── Header ───────────────────────────────── */
.floating-header{position:absolute;top:16px;left:50%;transform:translateX(-50%);z-index:500;display:flex;align-items:center;gap:12px;padding:8px 16px;border-radius:20px;border:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(20px);background:rgba(8,12,28,0.85);white-space:nowrap}
.back-btn{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.6);text-decoration:none;border:1px solid rgba(255,255,255,0.1);transition:all 0.2s;flex-shrink:0}
.back-btn:hover{color:#fff;border-color:rgba(255,255,255,0.25)}
.header-brand{display:flex;align-items:center;gap:8px}
.header-logo{font-size:20px}.header-title{font-size:12px;font-weight:800;letter-spacing:0.15em;color:#fff}.header-sub{font-size:9px;color:rgba(255,255,255,0.3);margin-top:1px}
.header-search{display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.4)}
.header-search-input{background:transparent;border:none;outline:none;color:#fff;font-size:12px;width:160px;font-family:'Outfit',sans-serif}
.header-search-input::placeholder{color:rgba(255,255,255,0.3)}
.header-search-clear{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);font-size:16px;line-height:1;padding:0}
.header-search-clear:hover{color:#fff}

/* ── Layers panel ─────────────────────────── */
.overlay-panel{position:absolute;top:80px;left:16px;z-index:500;padding:14px;border-radius:18px;min-width:155px;background:rgba(8,12,28,0.9);border:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(20px)}
.overlay-title,.panel-title{font-size:9px;font-weight:700;letter-spacing:0.15em;color:rgba(255,255,255,0.3);margin-bottom:0}
.overlay-list{display:flex;flex-direction:column;gap:4px;margin-top:10px}
.ov-btn{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.04);cursor:pointer;color:rgba(255,255,255,0.5);font-family:'Outfit',sans-serif;font-size:12px;font-weight:500;transition:all 0.2s;text-align:left;width:100%}
.ov-btn:hover{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.8)}
.ov-icon{font-size:16px;width:22px;text-align:center}.ov-name{flex:1}.ov-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.ov-legend{margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08)}
.legend-bar{height:6px;border-radius:3px;margin-bottom:5px}.legend-labels{display:flex;justify-content:space-between;font-size:9px;color:rgba(255,255,255,0.35)}
.legend-labels span:nth-child(2){color:rgba(255,255,255,0.5);font-weight:600}
.legend-fade-enter-active,.legend-fade-leave-active{transition:opacity 0.25s,transform 0.25s}
.legend-fade-enter-from,.legend-fade-leave-to{opacity:0;transform:translateY(-6px)}

/* ── Map style panel ──────────────────────── */
.map-style-panel{position:absolute;top:80px;left:185px;z-index:500;padding:14px;border-radius:18px;min-width:125px;background:rgba(8,12,28,0.9);border:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(20px)}
.style-list{display:flex;flex-direction:column;gap:4px;margin-top:10px}
.style-btn{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.04);cursor:pointer;color:rgba(255,255,255,0.5);font-family:'Outfit',sans-serif;font-size:11px;font-weight:500;transition:all 0.2s;text-align:left;width:100%}
.style-btn:hover,.style-active{background:rgba(255,255,255,0.1);color:#fff;border-color:rgba(255,255,255,0.2)}
.style-preview{width:16px;height:16px;border-radius:4px;border:1px solid rgba(255,255,255,0.15);flex-shrink:0}.style-name{font-size:11px}

/* ── Province panel ───────────────────────── */
.province-panel{position:absolute;top:80px;right:16px;z-index:500;width:232px;border-radius:18px;background:rgba(8,12,28,0.92);border:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(20px);overflow:hidden;display:flex;flex-direction:column}
.province-panel-header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px 10px}
.panel-toggle{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;padding:4px;border-radius:6px;transition:all 0.2s}
.panel-toggle:hover{color:#fff;background:rgba(255,255,255,0.08)}
.region-tabs{display:flex;flex-wrap:wrap;gap:4px;padding:0 10px 8px}
.region-tab{padding:3px 9px;border-radius:20px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);cursor:pointer;font-size:10px;font-weight:600;color:rgba(255,255,255,0.35);font-family:'Outfit',sans-serif;transition:all 0.2s}
.region-tab:hover{color:#fff;border-color:rgba(255,255,255,0.2)}.region-tab-active{color:#fff!important}
.province-search-wrap{padding:0 10px 8px}
.province-filter-input{width:100%;box-sizing:border-box;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:6px 10px;color:#fff;font-size:11px;outline:none;font-family:'Outfit',sans-serif}
.province-filter-input::placeholder{color:rgba(255,255,255,0.25)}
.province-list{max-height:350px;overflow-y:auto;padding:0 6px 10px;display:flex;flex-direction:column;gap:2px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.08) transparent}
.province-item{display:flex;align-items:center;gap:7px;padding:7px 8px;border-radius:10px;border:1px solid transparent;background:transparent;cursor:pointer;text-align:left;width:100%;transition:all 0.15s;font-family:'Outfit',sans-serif}
.province-item:hover{background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.08)}
.province-active{background:rgba(255,255,255,0.06)!important}
.prov-dot-sm{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.prov-names{display:flex;flex-direction:column;flex:1;min-width:0}
.prov-name-en{font-size:12px;font-weight:600;color:rgba(255,255,255,0.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.prov-name-th{font-size:10px;color:rgba(255,255,255,0.3)}
.prov-cached-temp{font-size:11px;font-weight:700;color:#fff;font-family:'Space Mono',monospace;flex-shrink:0}
.prov-arrow{color:rgba(255,255,255,0.2);flex-shrink:0}

/* ── Coords ───────────────────────────────── */
.coords-pill{position:absolute;bottom:42px;left:50%;transform:translateX(-50%);z-index:500;padding:5px 14px;border-radius:20px;font-size:11px;font-family:'Space Mono',monospace;color:rgba(255,255,255,0.4);pointer-events:none;background:rgba(8,12,28,0.8);border:1px solid rgba(255,255,255,0.08);white-space:nowrap}

/* ── Loading ──────────────────────────────── */
.loading-overlay{position:absolute;inset:0;z-index:600;display:flex;align-items:center;justify-content:center;pointer-events:none}
.loading-card{display:flex;flex-direction:column;align-items:center;gap:10px;padding:24px 32px;border-radius:20px;background:rgba(8,12,28,0.92);border:1px solid rgba(255,255,255,0.1);pointer-events:auto}
.loading-rings{position:relative;width:48px;height:48px}
.ring{position:absolute;inset:0;border-radius:50%;border:2px solid transparent;animation:spin 1.2s linear infinite}
.ring-1{border-top-color:#38bdf8}.ring-2{border-right-color:#818cf8;animation-delay:-0.4s;inset:6px}.ring-3{border-bottom-color:#4ade80;animation-delay:-0.8s;inset:12px}
@keyframes spin{to{transform:rotate(360deg)}}
.loading-text{font-size:13px;color:rgba(255,255,255,0.7);font-weight:500}
.loading-coords{font-size:10px;color:rgba(255,255,255,0.35);font-family:'Space Mono',monospace}

/* ── Weather Sidebar (slides from RIGHT) ──── */
.weather-sidebar{position:absolute;top:0;right:0;bottom:0;width:310px;z-index:500;background:rgba(8,12,28,0.93);border-left:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(24px);display:flex;flex-direction:column;overflow-y:auto;overflow-x:hidden;padding:24px 18px 32px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.08) transparent}
@media(max-width:640px){.weather-sidebar{left:0;right:0;top:auto;width:100%;max-height:72vh;border-radius:24px 24px 0 0;border-left:none;border-top:1px solid rgba(255,255,255,0.12)}}
.sidebar-close{position:absolute;top:16px;right:52px;width:28px;height:28px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.06);cursor:pointer;color:rgba(255,255,255,0.5);display:flex;align-items:center;justify-content:center;transition:all 0.2s}
.sidebar-close:hover{color:#fff;background:rgba(255,255,255,0.12)}
.sidebar-share{position:absolute;top:16px;right:16px;width:28px;height:28px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.06);cursor:pointer;color:rgba(255,255,255,0.5);display:flex;align-items:center;justify-content:center;transition:all 0.2s}
.sidebar-share:hover{color:#fff;background:rgba(255,255,255,0.12)}
.sb-location{margin-bottom:16px;padding-top:4px}
.sb-city{font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.02em;line-height:1.1}
.sb-country{font-size:12px;color:rgba(255,255,255,0.45);margin-top:3px}
.sb-coords-tag{display:inline-flex;margin-top:6px;padding:3px 10px;border-radius:20px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);font-size:10px;font-family:'Space Mono',monospace;color:rgba(255,255,255,0.4)}
.sb-province-tag{display:inline-flex;align-items:center;gap:6px;margin-top:6px;padding:4px 10px;border-radius:20px;border:1px solid;font-size:10px;font-weight:600;letter-spacing:0.05em}
.sb-hero{margin-bottom:20px}
.sb-temp-wrap{display:flex;align-items:flex-start;gap:4px;margin-bottom:6px;line-height:1}
.sb-temp{font-size:80px;font-weight:900;color:#fff;letter-spacing:-0.04em;line-height:0.9}
.sb-temp-right{display:flex;flex-direction:column;padding-top:10px;gap:2px}
.sb-unit{font-size:26px;font-weight:300;color:rgba(255,255,255,0.45)}.sb-emoji{font-size:34px}
.sb-desc{font-size:14px;color:rgba(255,255,255,0.65);text-transform:capitalize}
.sb-feels{font-size:12px;color:rgba(255,255,255,0.35);margin-top:3px;margin-bottom:10px}
.unit-toggle{display:inline-flex;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.12);margin-top:4px}
.unit-btn{padding:5px 14px;border:none;cursor:pointer;background:transparent;color:rgba(255,255,255,0.4);font-family:'Outfit',sans-serif;font-size:12px;font-weight:600;transition:all 0.2s}
.unit-active{background:rgba(255,255,255,0.12);color:#fff}
.sb-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}
.sb-stat{padding:12px;border-radius:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.07)}
.sb-stat-icon{font-size:16px;margin-bottom:4px}.sb-stat-val{font-size:14px;font-weight:700;color:#fff;line-height:1.2}
.sb-stat-label{font-size:9px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.08em;margin-top:2px}
.sb-aqi{margin-bottom:16px;padding:14px;border-radius:16px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04)}
.aqi-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.aqi-label{font-size:9px;font-weight:700;letter-spacing:0.12em;color:rgba(255,255,255,0.3)}
.aqi-badge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;border:1px solid}
.aqi-bar-wrap{position:relative;height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;margin-bottom:10px}
.aqi-bar-bg{position:absolute;inset:0;background:linear-gradient(90deg,#4ade80,#facc15,#fb923c,#f87171,#c084fc)}
.aqi-bar-fill{position:absolute;right:0;top:0;bottom:0;background:rgba(8,12,28,0.7);transition:width 1s ease}
.aqi-metrics{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.aqi-metric{display:flex;justify-content:space-between;font-size:10px}
.aqi-metric-name{color:rgba(255,255,255,0.4)}.aqi-metric-val{color:rgba(255,255,255,0.7);font-family:'Space Mono',monospace}
.minimap-wrap{position:relative;margin-bottom:20px;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);height:130px}
.minimap{width:100%;height:100%}
.minimap-label{position:absolute;top:8px;left:10px;z-index:10;font-size:9px;font-weight:700;letter-spacing:0.1em;color:rgba(255,255,255,0.5);background:rgba(8,12,28,0.7);padding:2px 8px;border-radius:6px;backdrop-filter:blur(8px)}
.minimap-pin{position:absolute;bottom:8px;right:10px;z-index:10;font-size:18px;pointer-events:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.8))}
.sb-forecast{margin-bottom:20px}
.sb-forecast-label{font-size:9px;font-weight:700;letter-spacing:0.12em;color:rgba(255,255,255,0.3);margin-bottom:10px}
.sb-forecast-row{display:flex;gap:4px}
.sb-fc-item{flex:1;display:flex;flex-direction:column;align-items:center;padding:10px 4px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);gap:3px}
.sb-fc-day{font-size:9px;color:rgba(255,255,255,0.4);font-weight:600}.sb-fc-emoji{font-size:18px}
.sb-fc-hi{font-size:12px;font-weight:700;color:#fff}.sb-fc-lo{font-size:10px;color:rgba(255,255,255,0.35)}
.sb-full-btn{display:block;width:100%;padding:12px;border-radius:12px;text-align:center;font-size:13px;font-weight:700;color:#000;text-decoration:none;transition:opacity 0.2s,transform 0.15s;letter-spacing:0.01em}
.sb-full-btn:hover{opacity:0.88;transform:translateY(-1px)}

/* ── Hints / Toasts ───────────────────────── */
.hint-pill{position:absolute;bottom:80px;left:50%;transform:translateX(-50%);z-index:500;padding:10px 20px;border-radius:20px;display:flex;align-items:center;gap:10px;font-size:13px;color:rgba(255,255,255,0.6);background:rgba(8,12,28,0.85);border:1px solid rgba(255,255,255,0.1);white-space:nowrap;pointer-events:none}
.hint-pulse{width:8px;height:8px;border-radius:50%;background:#38bdf8;animation:hintPulse 1.5s ease-in-out infinite}
@keyframes hintPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.7)}}
.error-pill{background:rgba(239,68,68,0.15)!important;border-color:rgba(239,68,68,0.4)!important;color:#fca5a5!important}
.toast-pill{position:absolute;bottom:130px;left:50%;transform:translateX(-50%);z-index:600;padding:10px 20px;border-radius:20px;font-size:13px;color:rgba(255,255,255,0.85);background:rgba(8,12,28,0.95);border:1px solid rgba(255,255,255,0.2);white-space:nowrap;pointer-events:none}
.toast-pop-enter-active{transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1)}.toast-pop-leave-active{transition:all 0.2s ease}
.toast-pop-enter-from{opacity:0;transform:translateX(-50%) translateY(10px) scale(0.9)}.toast-pop-leave-to{opacity:0;transform:translateX(-50%) translateY(-6px)}

/* ── Transitions ──────────────────────────── */
.slide-left-enter-active,.slide-left-leave-active{transition:transform 0.35s cubic-bezier(0.4,0,0.2,1),opacity 0.3s}
.slide-left-enter-from,.slide-left-leave-to{transform:translateX(100%);opacity:0}
@media(max-width:640px){.slide-left-enter-from,.slide-left-leave-to{transform:translateY(100%);opacity:0}}
.fade-enter-active,.fade-leave-active{transition:opacity 0.25s}.fade-enter-from,.fade-leave-to{opacity:0}
.glass{backdrop-filter:blur(20px)}.glass-inner{background:rgba(255,255,255,0.04)}.glass-hover{transition:all 0.2s}.glass-hover:hover{background:rgba(255,255,255,0.08)}
@media(max-width:640px){.map-style-panel{display:none}.province-panel{width:180px}.floating-header{gap:8px;padding:8px 10px}}
</style>