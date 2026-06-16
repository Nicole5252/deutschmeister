import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/deutschmeister/', // 預設 GitHub Pages 專案路徑，若您的 Repository 名稱不同，請修改此處
})
