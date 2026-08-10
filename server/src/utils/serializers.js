export function lowerKeys(value) {
  if (Array.isArray(value)) return value.map(lowerKeys)
  if (!value || typeof value !== 'object' || value instanceof Date) return value
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key.toLowerCase(), lowerKeys(nested)])
  )
}
