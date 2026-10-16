// Compatibility exports; all items originate in the canonical navigation registry.
import { navigationForRole } from './navigation'
export const hrMenu = navigationForRole('hr')
export const employeeMenu = navigationForRole('employee', { supervisor: true })
export const employeeRemedEntry = navigationForRole('employee', { remed: true, supervisor: true }).find(item => item.remed)!
export const hrRemedEntry = navigationForRole('hr', { remed: true }).find(item => item.remed)!
