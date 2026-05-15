import { defineConfig } from 'vite'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { createFoundryMiddleware } = require('./server/foundry.js')

export default defineConfig({
  plugins: [
    {
      name: 'hr-chat-api',
      configureServer(server) {
        server.middlewares.use('/api', createFoundryMiddleware())
      },
    },
  ],
})
