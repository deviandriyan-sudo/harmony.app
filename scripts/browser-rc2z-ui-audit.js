/*
 * HARMONY RC2Z — read-only browser computed-style probe.
 * Paste the complete contents into Chrome/Edge DevTools Console on a LOCAL QA
 * session after signing in. This does not modify UI, data, storage, or routes.
 * It does not access form values, text, cookies, tokens, or network resources.
 *
 * Execute separately on each relevant route and theme/viewport configuration.
 */
(() => {
  'use strict'

  const targets = [
    { label: 'Sidebar panel', selector: '.harmony-sidebar-panel', limit: 1 },
    { label: 'Sidebar active link', selector: '.harmony-sidebar-nav .harmony-nav-active', limit: 1 },
    { label: 'Topbar', selector: '.harmony-topbar', limit: 1 },
    { label: 'Topbar search', selector: '.harmony-topbar-search', limit: 1 },
    { label: 'Attendance panel', selector: '.harmony-rc2q-attendance-panel', limit: 2 },
    { label: 'Attendance metric', selector: '.harmony-rc2q-approved-metric', limit: 6 },
    { label: 'Attendance history', selector: '.harmony-attendance-history', limit: 1 },
    { label: 'Workspace card', selector: '.harmony-workspace .harmony-card', limit: 2 },
    { label: 'SCALE UP panel', selector: '.scaleup-root .scaleup-panel', limit: 2 },
    { label: 'Re-Med surface', selector: '.harmony-remed-page-header', limit: 1 },
    { label: 'Modal surface', selector: '.harmony-modal-surface', limit: 1 },
    { label: 'Leave modal panel', selector: '.harmony-leave-modal-panel', limit: 1 },
    { label: 'Form field', selector: '.harmony-workspace .harmony-input', limit: 2 },
    { label: 'Native dropdown', selector: '.harmony-workspace select', limit: 2 },
    { label: 'Table', selector: '.harmony-workspace table', limit: 1 },
  ]

  const short = (value, length = 95) =>
    typeof value === 'string' && value.length > length
      ? value.slice(0, length) + '…'
      : value

  const rows = []
  const missing = []

  for (const { label, selector, limit } of targets) {
    const elements = Array.from(document.querySelectorAll(selector)).slice(0, limit)
    if (!elements.length) {
      missing.push(label)
      continue
    }
    for (const [index, element] of elements.entries()) {
      const css = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      const standardFilter = css.backdropFilter
      const fallbackFilter = css.webkitBackdropFilter
      const filter = standardFilter && standardFilter !== 'none'
        ? standardFilter
        : (fallbackFilter || standardFilter || 'none')
      const before = element.classList.contains('harmony-liquid-lit')
        ? getComputedStyle(element, '::before')
        : null
      rows.push({
        surface: elements.length > 1 ? label + ' #' + (index + 1) : label,
        background: short(css.backgroundColor),
        gradient: css.backgroundImage !== 'none',
        backdrop: short(filter),
        foreground: css.color,
        border: css.borderTopColor,
        shadow: css.boxShadow !== 'none',
        glassLit: element.style.getPropertyValue('--harmony-lit') || '(unset)',
        glintOpacity: before ? before.opacity : '-',
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        clippedX: element.scrollWidth > element.clientWidth + 2,
      })
    }
  }

  const theme = document.documentElement.dataset.harmonyTheme || '(unset)'
  const preference = document.documentElement.dataset.harmonyThemePreference || '(unset)'
  const root = document.documentElement
  const summary = {
    theme,
    preference,
    viewport: window.innerWidth + '×' + window.innerHeight,
    documentWidth: root.scrollWidth,
    horizontalPageOverflow: root.scrollWidth > root.clientWidth + 2,
    backdropSupported: Boolean(
      window.CSS && (
        CSS.supports('backdrop-filter', 'blur(1px)') ||
        CSS.supports('-webkit-backdrop-filter', 'blur(1px)')
      )
    ),
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    reducedTransparency: matchMedia('(prefers-reduced-transparency: reduce)').matches,
    increasedContrast: matchMedia('(prefers-contrast: more)').matches,
    hoverFine: matchMedia('(hover: hover) and (pointer: fine)').matches,
    matchingSurfaces: rows.length,
    absentOnThisPage: missing,
  }

  console.info('HARMONY RC2Z — computed-style snapshot (read-only; no personal data)')
  console.table(rows)
  console.info('HARMONY RC2Z — context', summary)
  console.info(
    'A missing selector can be normal on another route. Gradients and translucent surfaces require visual contrast review; this probe does not certify accessibility or workflow correctness.'
  )
  return { rows, summary }
})()
