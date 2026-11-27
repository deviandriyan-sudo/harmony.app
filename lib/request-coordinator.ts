/** In-memory, session-bound single flight. No persisted or completed business-data cache. */
export class RequestCoordinator {
  private token = ''
  private generation = 0
  private flights = new Map<string, Promise<unknown>>()

  observeToken(token: string) {
    if (this.token !== token) {
      this.token = token
      this.generation += 1
      this.flights.clear()
    }
  }

  isCurrent(token: string, generation: number) {
    return this.token === token && this.generation === generation
  }

  get epoch() { return this.generation }

  clearReads() { this.flights.clear() }

  run<T>(token: string, key: string, task: () => Promise<T>, share = true): Promise<T> {
    const generation = this.generation
    if (!this.isCurrent(token, generation)) return Promise.reject(new Error('Sesi telah berubah. Muat ulang halaman.'))
    const previous = share ? this.flights.get(key) : undefined
    if (previous) return previous as Promise<T>
    const promise = Promise.resolve().then(task).then(result => {
      if (!this.isCurrent(token, generation)) throw new Error('Sesi telah berubah. Muat ulang halaman.')
      return result
    }).finally(() => { if (this.flights.get(key) === promise) this.flights.delete(key) })
    if (share) this.flights.set(key, promise)
    return promise
  }
}

// Explicit read-only routes: GET endpoints which reconcile, sign documents,
// generate reports or mutate data are deliberately excluded.
const SHAREABLE = new Set([
  '/api/auth/access', '/api/remed/session', '/api/remed/dashboard',
  '/api/remed/finance/summary', '/api/remed/claims',
  '/api/scaleup', '/api/scaleup/records', '/api/scaleup/authorities',
  '/api/hr/dashboard/monitoring', '/api/employee/dashboard/approval-summary',
  '/api/employee/team-availability', '/api/phl/work-requests',
])
export function canShareRead(input: string, init?: RequestInit) {
  return (!init || ((!init.method || init.method.toUpperCase() === 'GET') && !init.signal && !init.headers && !init.body && Object.keys(init).every(key => key === 'method')))
    && SHAREABLE.has(input.split('?')[0])
}
