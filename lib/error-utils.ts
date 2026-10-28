/** Normalize non-standard thrown values without assuming every rejection is an Error. */
function errorProperty(error: unknown, key: string): unknown {
  return typeof error === 'object' && error !== null && key in error
    ? (error as Record<string, unknown>)[key]
    : undefined
}

export function readErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  const message = errorProperty(error, 'message')
  if (message !== undefined && message !== null) return String(message)
  return typeof error === 'string' ? error : ''
}

export function readErrorName(error: unknown): string {
  if (error instanceof Error) return error.name
  const name = errorProperty(error, 'name')
  return name === undefined || name === null ? '' : String(name)
}

export function readErrorStatus(error: unknown): number | undefined {
  const status = errorProperty(error, 'status')
  const value = Number(status)
  return status === null || status === undefined || !Number.isFinite(value) ? undefined : value
}
