// Compatibility exports only; no parallel navigation configuration.
import { navigationForRole } from './navigation'
export const remedEmployeeMenu = navigationForRole('employee', { remed: true, supervisor: true })
export const remedHrMenu = navigationForRole('hr', { remed: true })
export const remedFinanceMenu = navigationForRole('finance')
