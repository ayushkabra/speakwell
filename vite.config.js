import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function copyOgPreviewPlugin() {
  return {
    name: 'copy-og-preview',
    buildStart() {
      const src = 'C:/Users/Ayush/.gemini/antigravity/brain/ac97c37c-a387-4441-87b0-439fac424cac/.user_uploaded/media__1787236289127.png';
      const dest = path.resolve(__dirname, 'public/og-preview.png');
      if (fs.existsSync(src)) {
        try {
          fs.copyFileSync(src, dest);
          console.log('Successfully copied og-preview.png to public/');
        } catch (err) {
          console.warn('og-preview copy notice:', err.message);
        }
      }
    }
  }
}

export default defineConfig({
  base: '/speakwell/',
  plugins: [copyOgPreviewPlugin(), react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
