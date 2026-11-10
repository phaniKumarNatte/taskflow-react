import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Tailwind v4 is configured as a Vite plugin rather than via
  // postcss.config.js + tailwind.config.js — it scans source files for
  // class names at build time directly through Vite's pipeline, which is
  // why no separate content-glob config file is needed.
  plugins: [react(), tailwindcss()],
})
