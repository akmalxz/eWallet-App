import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          // Charts — heavy, only loaded by the lazy-loaded Analytics page
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts'

          // Supabase client
          if (id.includes('@supabase')) return 'vendor-supabase'

          // Icon libraries
          if (id.includes('lucide-react') || id.includes('react-icons')) return 'vendor-icons'

          // React core — the only chunk guaranteed to load on every page
          if (
            id.includes('react-dom') ||
            id.includes('/react/') ||
            id.includes('scheduler')
          ) {
            return 'vendor-react'
          }

          // Everything else from node_modules
          return 'vendor'
        }
      }
    },
    chunkSizeWarningLimit: 800
  }
})