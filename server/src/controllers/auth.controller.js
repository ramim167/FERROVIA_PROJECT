import * as authService from '../services/auth.service.js'

export async function register(req, res) {
  const data = await authService.registerPassenger(req.body)
  res.status(201).json({ success: true, data })
}

export async function login(req, res) {
  const data = await authService.login(req.body)
  res.json({ success: true, data })
}

export async function me(req, res) {
  const data = await authService.getCurrentUser(req.user.userId)
  res.json({ success: true, data })
}
