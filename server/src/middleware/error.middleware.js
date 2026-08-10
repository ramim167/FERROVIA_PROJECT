export function notFoundHandler(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`)
  error.status = 404
  next(error)
}

export function errorHandler(error, _req, res, _next) {
  console.error(error)
  const status = error.status || 500
  const body = {
    success: false,
    error: status === 500 ? 'Internal server error' : error.message,
  }
  if (error.details !== undefined && status !== 500) body.details = error.details
  if (process.env.NODE_ENV !== 'production' && status === 500) body.debug = error.message
  res.status(status).json(body)
}
