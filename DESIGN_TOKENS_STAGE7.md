# HARMONY theme semantics — Stage 7

Source: `app/theme-normalization.css` (semantic aliases) plus preserved existing glass surface and HR-modal CSS. No all-page redesign is claimed.

| Token | Light | Dark |
|---|---|---|
| Background | `#edf5ff` | `#06152b` |
| Surface | `rgba(249,252,255,.93)` | `rgba(22,49,81,.94)` |
| Elevated | `#ffffff` | `#173c61` |
| Border | `rgba(61,117,181,.27)` | `rgba(138,192,235,.35)` |
| Text | `#122b4a` | `#f0f7ff` |
| Muted | `#526985` | `#bbd1e8` |
| Primary | `#075cc8` | `#095fcb` |
| Secondary/link | `#0759b8` | `#91ceff` |
| Success | `#075938` | `#b7ffe1` |
| Warning | `#794600` | `#ffe0a1` |
| Danger | `#991d35` | `#ffd3dc` |
| Info | `#134d9f` | `#d0e8ff` |
| Focus | `#075ed2` | `#7cdbff` |

Use semantic background and foreground pairs together. Do not place status foreground color alone on unrelated white/glass cards. Keep existing `prefers-reduced-motion`, keyboard focus, dark/light theme provider, and print paper styles. Visual browser/viewport confirmation remains open (no browser runtime used).
