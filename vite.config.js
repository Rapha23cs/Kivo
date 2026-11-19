import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

function kivoOfflineSwPlugin() {
  return {
    name: 'kivo-offline-sw-manifest',
    closeBundle() {
      const distDir = path.resolve(process.cwd(), 'dist')
      const swPath = path.join(distDir, 'sw.js')
      const assetsDir = path.join(distDir, 'assets')
      if (!fs.existsSync(swPath)) return

      let assetUrls = []
      if (fs.existsSync(assetsDir)) {
        assetUrls = fs
          .readdirSync(assetsDir)
          .filter((name) => !name.endsWith('.map'))
          .map((name) => `/assets/${name}`)
      }

      const version = `kivo-shell-${Date.now()}`
      let swContent = fs.readFileSync(swPath, 'utf8')
      swContent = swContent
        .replace('__KIVO_CACHE_VERSION__', version)
        .replace('/* __KIVO_PRECACHE__ */ []', JSON.stringify(assetUrls))
      fs.writeFileSync(swPath, swContent, 'utf8')
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), kivoOfflineSwPlugin()],
  server: {
    port: 3000,
    open: false
  },
  preview: {
    host: '0.0.0.0',
    port: 3000
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'icons-vendor': ['lucide-react']
        }
      }
    }
  }
})

