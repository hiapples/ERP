// frontend/vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  // 產出到 backend/dist
  build: {
    outDir: path.resolve(__dirname, '../backend/dist'),
    emptyOutDir: true
  },
  // 同網域根目錄
  base: '/'
})
