export function delayMinutes(actual, scheduled) {
  if (!actual || !scheduled) return 0
  return Math.max(0, Math.round((new Date(actual).getTime() - new Date(scheduled).getTime()) / 60000))
}
