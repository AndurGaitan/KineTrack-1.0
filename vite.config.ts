import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Identificador de cada compilación: la app lo compara con /version.json para avisar que hay una versión nueva.
const BUILD_ID = String(Date.now())

function versionFile(): Plugin {
  return {
    name: 'kinetrack-version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID }) })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), versionFile()],
  define: {
    __APP_BUILD__: JSON.stringify(command === 'build' ? BUILD_ID : 'dev'),
  },
}))
