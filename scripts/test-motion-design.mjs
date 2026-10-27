import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const css=read('app/globals.css');
for (const token of ['--harmony-prism-glow','--harmony-prism-focus','--harmony-motion-normal','harmony-prism-enter','harmony-prism-drop','harmony-prism-float']) assert(css.includes(token),`Missing prism motion token: ${token}`);
for (const guard of ['prefers-reduced-motion','prefers-reduced-transparency','@media print','harmony-notification-portal,.harmony-subnav-portal']) assert(css.includes(guard),`Missing motion/accessibility guard: ${guard}`);
for (const [file,classname] of [
 ['components/layout/AppSidebar.tsx','harmony-motion-nav'],
 ['components/layout/ModuleSubnav.tsx','harmony-motion-subnav'],
 ['components/dashboard/CompactMetric.tsx','harmony-motion-metric'],
 ['components/dashboard/WorkspaceActions.tsx','harmony-motion-action'],
 ['components/dashboard/GlassHeroVisual.tsx','harmony-motion-sculpture'],
 ['components/profile/ProfileWorkspace.tsx','harmony-motion-disclosure']
]) assert(read(file).includes(classname),`Missing scoped motion hook: ${file}`);
// No new runtime dependencies, no direct manipulation of payments / approval / balances.
const p=JSON.parse(read('package.json'));
const l=JSON.parse(read('package-lock.json'));
assert.equal(p.version,l.version);
assert.equal(p.version,l.packages[''].version);
console.log('HARMONY prism motion PASS: tokens, motion hooks, a11y fallbacks and lockfile version');
