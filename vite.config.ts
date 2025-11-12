import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES ? '/kids-safe-routes/' : '/',
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
