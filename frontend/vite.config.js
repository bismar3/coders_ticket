import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * En desarrollo, el proxy de Vite cumple el papel de Nginx: /api/<servicio>/... -> servicio (quitando /api).
 * payments y notifications NO se exponen: solo los llaman otros servicios.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = (name, port) => ({
    target: env[`${name.toUpperCase()}_URL`] || `http://127.0.0.1:${port}`,
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  })

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      host: true,
      // Permite abrir la web por un túnel de ngrok (callback de Libélula / pruebas desde el celular)
      allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.io'],
      proxy: {
        '/api/auth': target('auth', 8001),
        '/api/events': target('events', 8002),
        '/api/orders': target('orders', 8003),
        '/api/tickets': target('tickets', 8005),
        '/api/checkin': target('checkin', 8007),
      },
    },
  }
})
