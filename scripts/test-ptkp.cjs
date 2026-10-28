/* Legacy command compatibility. The maintained test uses ESM imports. */
void import('./test-ptkp.mjs').catch((error) => {
  console.error(error)
  process.exitCode = 1
})
