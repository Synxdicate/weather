export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['Outfit', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      }
    }
  },
  plugins: []
}
