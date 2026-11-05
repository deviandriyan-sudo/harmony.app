/** A shared, non-interactive loading shell for slow App Router transitions.
 * Individual data tables keep their own granular loading indicators. */
export function RouteLoading({ label }: { label: string }) {
  return (
    <div className="harmony-route-loading mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="mb-5 flex items-center justify-between gap-5">
        <div className="space-y-3">
          <div className="h-3 w-28 rounded-full bg-slate-200/70 dark:bg-slate-600/40" />
          <div className="h-7 w-52 max-w-[70vw] rounded-lg bg-slate-200/70 dark:bg-slate-600/40" />
        </div>
        <div className="h-9 w-24 rounded-xl bg-slate-200/70 dark:bg-slate-600/40" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 rounded-2xl border border-slate-200/70 bg-white/50 p-4 dark:border-slate-600/30 dark:bg-slate-900/20">
            <div className="h-3 w-28 max-w-full rounded bg-slate-200/70 dark:bg-slate-600/40" />
            <div className="mt-5 h-7 w-20 rounded-lg bg-slate-200/70 dark:bg-slate-600/40" />
          </div>
        ))}
      </div>
      <div className="mt-4 h-56 rounded-2xl border border-slate-200/70 bg-white/50 p-5 dark:border-slate-600/30 dark:bg-slate-900/20">
        <div className="h-4 w-44 max-w-full rounded-lg bg-slate-200/70 dark:bg-slate-600/40" />
        <div className="mt-5 h-2 w-full rounded bg-slate-200/70 dark:bg-slate-600/40" />
        <div className="mt-4 h-2 w-11/12 rounded bg-slate-200/70 dark:bg-slate-600/40" />
        <div className="mt-4 h-2 w-3/4 rounded bg-slate-200/70 dark:bg-slate-600/40" />
      </div>
    </div>
  )
}
