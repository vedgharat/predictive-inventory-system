import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // THE FIX: Tells Vite that 'global' just means 'window' in the browser
    global: 'window', 
  },
})