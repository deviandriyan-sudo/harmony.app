# DESIGN_SYSTEM — HARMONY V3.8.5

## Architecture

The existing `HarmonyThemeProvider` is the only state owner. It applies `document.documentElement.dataset.harmonyTheme`, with localStorage key `harmony-color-theme` and system color preference as the initial fallback. Do not add another provider or key.

Global CSS order: `app/globals.css` (existing glass/motion/layout) → `app/theme-normalization.css` (semantic color decisions). Theme colors are data attributes on `html`; portalled modals inherit tokens via document root, not role workspace.

## Dual theme token map

| Semantic role | Light | Dark |
|---|---|---|
| Canvas | `#EDF5FF` | `#06152B` |
| Primary text | `#122B4A` | `#F0F7FF` |
| Secondary text | `#3C5572` | `#D4E5F7` |
| Muted text | `#526985` | `#BBD1E8` |
| Link text | `#0759B8` | `#91CEFF` |
| Raised surface | `#FFFFFF` | `#173C61` |
| Soft surface | `#E4EFFB` | `#193756` |
| Table header | `#DCEAFA` | `#24466B` |
| Table header text | `#173756` | `#F0F7FF` |
| Status neutral | `#E3EAF3` / `#263D59` | `#304D6E` / `#EDF6FF` |
| Primary button | `#075CC8` | `#095FCB` |
| Focus | `#075ED2` | `#7CDBFF` |

The complete definitive values (including alpha glass colors) are declared as `--h385-*` CSS variables in `app/theme-normalization.css`. Keep the existing brand tokens `--h-color-*` and older styling consumers compatible.

## Semantic status combinations

| Status | Light background / foreground | Dark background / foreground |
|---|---|---|
| Success / approved / paid | `#DEF6EA` / `#075938` | `#164B42` / `#B7FFE1` |
| Warning / pending | `#FFF0D3` / `#794600` | `#624313` / `#FFE0A1` |
| Danger / rejected | `#FFE5EA` / `#991D35` | `#602B3A` / `#FFD3DC` |
| Info | `#DBEAFE` / `#134D9F` | `#154779` / `#D0E8FF` |
| Purple / extra assignment | `#EDE6FF` / `#58349E` | `#45336C` / `#E9D7FF` |

Always show a textual label, icon or numerical value in addition to color. Re-Med statuses are `data-remed-status` variants. Neutral zero does not use nearly transparent white.

## How to author new components

- Text: `harmony-text-primary`, `harmony-text-secondary`, `harmony-text-muted`, `harmony-text-link`.
- Semantic colored label: `harmony-text-success`, `harmony-text-warning`, `harmony-text-violet`.
- Placeholder: `harmony-placeholder-muted`. Hover text: `harmony-hover-text-primary` / `harmony-hover-text-link` (do not write invalid `hover:harmony-*` classes).
- Use matched surface/ink tokens: `--h385-surface` with `--h385-ink`; `--h385-table-head` with `--h385-table-head-ink`; and paired status tokens.
- Keep layout, animation and permission logic independent of theme. Do not use theme to conditionally hide controls.
- Use named variants rather than hardcoded `text-white` atop a surface which is independently recolored to light blue.
- Glass opacity must not remove text contrast. Limit overlay blur; prefer a softly opaque information region below decorative reflections.
- For `createPortal` modal content, apply root theme tokens directly, not only `.harmony-workspace` descendant selectors.
- Preserve print's white-paper contrast via `.harmony-print-document`.
- Do not animate numeric HR/Finance data or reset form values on theme switch.
- Verify desktop, tablet, mobile, focus, disabled, loading, and positive/negative/neutral status examples in both themes.

## Maintenance

- Avoid further duplicate global `!important` cascade expansions. New semantic primitives belong in `app/theme-normalization.css` or their owning component.
- Run `npm run test:theme-normalization` to check table/status foreground/background contrasts and route integrity; run all existing tests and `npm run build` on a machine with complete dependencies.
