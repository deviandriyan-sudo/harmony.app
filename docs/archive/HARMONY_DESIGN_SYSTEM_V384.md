# HARMONY V3.8.4 — Semantic Color System

The single HARMONY color language spans login, HR, Employee, Finance and Re-Med. The authentic campus photo supplied by the project owner is used only on the login branding panel. It is not generated imagery and no employee data or financial logic is changed.

| Semantic token | Light | Dark | Intended use |
|---|---|---|---|
| `--h-color-primary` | `#0869dc` | `#3995ff` | Links and primary emphasis |
| `--h-color-primary-hover` | `#0759bd` | `#70baff` | Primary hover |
| `--h-color-primary-active` | `#064998` | `#126fd5` | Pressed states |
| `--h-color-cyan` | `#087aa5` | `#60dcff` | Minor brand accent |
| `--h-color-indigo` | `#5657c9` | `#a0a9ff` | Secondary information |
| `--h-color-bg` | `#eff6ff` | `#050d1b` | Application canvas |
| `--h-color-bg-elevated` | `#f8fbff` | `#0d233c` | Elevated surfaces |
| `--h-color-surface` | `rgba(250,253,255,.84)` | `rgba(18,46,78,.82)` | Frosted surfaces |
| `--h-color-surface-raised` | `rgba(255,255,255,.94)` | `rgba(24,56,94,.94)` | Dialogs and raised cards |
| `--h-color-glass-border` | `rgba(255,255,255,.87)` | `rgba(146,205,250,.21)` | Optical glass edge |
| `--h-color-divider` | `rgba(55,103,161,.18)` | `rgba(150,197,237,.18)` | Separators |
| `--h-color-text` | `#122d4d` | `#f4faff` | Primary text |
| `--h-color-text-soft` | `#405b7b` | `#cfddf3` | Supporting text |
| `--h-color-text-muted` | `#58708d` | `#a7bfdc` | Minor metadata |
| `--h-color-focus` | `#0869dc` | `#72d9ff` | Keyboard focus |
| `--h-color-success` | `#127c5f` | `#53e1b0` | Completed / approved |
| `--h-color-warning` | `#a96307` | `#ffca75` | Pending attention |
| `--h-color-danger` | `#bd3347` | `#ff8fa2` | Error / rejected |
| `--h-color-info` | `#1568be` | `#85bbff` | Informational |

## Behavior
- The default theme follows the OS color scheme on the first visit. Users can override this explicitly on the login and sidebar, saved as `harmony-color-theme` in localStorage; other tabs sync on the storage event.
- The switch has accessible labels, `aria-pressed`, and focus states. Mode changes never reset form state, approval state or network session.
- No dark/light switch is added to database tables or user profiles, avoiding migrations and unintended RLS changes.
- Only specific shared UI classes get the dark material; semantic status colors remain semantically distinct. Testing in a live authenticated browser is still needed for all legacy page-level utility classes.
- Standard motion is lightweight and respects `prefers-reduced-motion`; transparent surfaces have an opaque fallback with `prefers-reduced-transparency`.

## Design principles
Deep navy, cobalt and cyan are the brand; other hues are reserved for meaningful statuses. Default light mode remains frosted white and sky blue. Glass shine is restrained, text contrast and reading hierarchy have priority over decoration, and dashboards stay compact.
