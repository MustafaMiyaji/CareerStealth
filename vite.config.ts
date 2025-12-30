import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // This ensures process.env is available in the browser if needed for other libs,
    // though usually import.meta.env is preferred in Vite.
    'process.env': {} 
  }
})