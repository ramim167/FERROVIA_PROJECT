import 'dotenv/config'
import { createApp } from './app.js'
import { closeDatabase, initializeDatabase } from './config/database.js'

const port = Number(process.env.PORT || 5000)

async function start() {
  await initializeDatabase()
  const app = createApp()
  const server = app.listen(port, () => {
    console.log(`FERROVIA API running on http://localhost:${port}`)
  })

  async function shutdown(signal) {
    console.log(`\n${signal} received. Closing FERROVIA API...`)
    server.close(async () => {
      try {
        await closeDatabase()
        process.exit(0)
      } catch (error) {
        console.error(error)
        process.exit(1)
      }
    })
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

start().catch((error) => {
  console.error('Failed to start FERROVIA API:', error)
  process.exit(1)
})
