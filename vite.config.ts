import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Определяем base path для GitHub Pages
// Для GitHub Pages используем '/kids-safe-routes/' (имя репозитория)
// Для локальной разработки используем '/'
const base = process.env.GITHUB_PAGES === 'true' ? '/kids-safe-routes/' : '/'

export default defineConfig({
  plugins: [react()],
  base,
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api/ors': {
        target: 'https://api.openrouteservice.org',
        changeOrigin: true,
        rewrite: (path) => {
          // Сохраняем query параметры при rewrite
          const [basePath, query] = path.split('?')
          const newPath = basePath.replace(/^\/api\/ors/, '/v2')
          return query ? `${newPath}?${query}` : newPath
        },
      },
    },
  },
})
