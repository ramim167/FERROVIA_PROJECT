import { forbidden, unauthorized } from '../utils/httpError.js'
import { verifyToken } from '../utils/authCrypto.js'

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) return next(unauthorized('Authentication token required'))

  try {
    req.user = verifyToken(token)
    next()
  } catch (error) {
    next(error)
  }
}

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(unauthorized())
  if (!roles.includes(req.user.role)) return next(forbidden(`Requires role: ${roles.join(' or ')}`))
  next()
}
