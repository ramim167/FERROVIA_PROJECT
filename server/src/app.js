import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.routes.js'
import stationRoutes from './routes/station.routes.js'
import trainRoutes from './routes/train.routes.js'
import tripRoutes from './routes/trip.routes.js'
import operatorRoutes from './routes/operator.routes.js'
import bookingRoutes from './routes/booking.routes.js'
import adminRoutes from './routes/admin.routes.js'
import notificationRoutes from './routes/notification.routes.js'
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || true, credentials: true }))
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'FERROVIA API is running' })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/stations', stationRoutes)
  app.use('/api/trains', trainRoutes)
  app.use('/api/trips', tripRoutes)
  app.use('/api/operator', operatorRoutes)
  app.use('/api/bookings', bookingRoutes)
  app.use('/api/admin', adminRoutes)
  app.use('/api/notifications', notificationRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
