import * as bookingService from '../services/booking.service.js'

export async function classes(req, res) {
  const data = await bookingService.availableClasses(req.query)
  res.json({ success: true, data })
}

export async function seats(req, res) {
  const data = await bookingService.availableSeats(req.query)
  res.json({ success: true, data })
}

export async function create(req, res) {
  const data = await bookingService.createPendingBooking(req.user.userId, req.body)
  res.status(201).json({ success: true, data })
}

export async function pay(req, res) {
  const data = await bookingService.payBooking(req.user.userId, req.params.pnr, req.body)
  res.json({ success: true, data })
}

export async function listMine(req, res) {
  const data = await bookingService.getUserBookings(req.user.userId)
  res.json({ success: true, data })
}

export async function getMine(req, res) {
  const data = await bookingService.getUserBooking(req.user.userId, req.params.pnr)
  res.json({ success: true, data })
}

export async function cancelMine(req, res) {
  const data = await bookingService.cancelUserBooking(req.user.userId, req.params.pnr)
  res.json({ success: true, data })
}
