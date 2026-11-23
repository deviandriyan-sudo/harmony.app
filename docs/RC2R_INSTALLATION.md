# RC2R — Safe installation and rollback

This is a GitHub source branch, **not** an automatically verified full-replacement
installer ZIP. It is based on the RC2Q hero-fix branch and leaves `main` unchanged.
Use the following on the existing Windows project only after a backup is available.

## Preconditions

- RC2Q installed, verified, and build-passing.
- Local Git branch `harmony-rc2q-uiux-baseline` contains the cherry-picked
  hero image fix `c23dd3b` (or equivalent contents).
- Git is installed, `.git` is preserved, and `.env.local` remains local.
- No uncommitted changes; do not merge with a dirty working tree.

## Safe local trial in a NEW branch

```powershell
cd 'D:\WEBSITE\harmony.app'

git status --short
if ((git status --porcelain).Length -gt 0) {
    throw 'STOP: Commit/back up local changes before the RC2R trial.'
}

git fetch origin
if ($LASTEXITCODE -ne 0) { throw 'STOP: Git fetch failed.' }

git switch harmony-rc2q-uiux-baseline
if ($LASTEXITCODE -ne 0) { throw 'STOP: RC2Q baseline unavailable.' }

git switch -c harmony-rc2r-local-qa
if ($LASTEXITCODE -ne 0) { throw 'STOP: RC2R test branch already exists or switch failed.' }

git merge --no-ff origin/feat/rc2r-secure-uiux -m 'test: integrate rc2r secure uiux'
if ($LASTEXITCODE -ne 0) {
    Write-Host 'STOP: Resolve conflict manually, or run git merge --abort.'
    throw 'RC2R merge failed.'
}
```

This does not push to GitHub `main` or production. Only the RC2R candidate
branch is merged into the separate local QA branch.

## Release checks

Stop `npm run dev` before the production build; rerun the browser after build.

```powershell
npx tsc --noEmit
npm run lint
npm run test:smoke
npm run test:theme
npm run test:theme-normalization
npm run test:rc2q:frontends
npm run test:rc2r:uiux
npm run test:modal-route-audit
npm run test:remed-print
npm run build
npm audit --omit=dev
```

Do not ignore a failed command. Inspect both themes, System preference,
all access levels, modal focus trapping, upload and print views before merging
to a production branch. Use test records, not destructive production tests.

## Rollback

```powershell
cd 'D:\WEBSITE\harmony.app'
git switch harmony-rc2q-uiux-baseline
npm run build
```

If test work has uncommitted changes, commit/stash/review them before switching;
do not use `git reset --hard` or force-push to discard user code.

No Supabase SQL or schema migration is required.
