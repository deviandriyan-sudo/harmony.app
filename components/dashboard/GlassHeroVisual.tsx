import { CalendarCheck2, FileCheck2, ShieldCheck, WalletCards } from 'lucide-react'

/** Decorative glass sculpture only: no requests, handlers, state or workflow. */
export function GlassHeroVisual({ role }: { role: 'hr' | 'employee' | 'finance' }) {
  const Icon = role === 'finance' ? WalletCards : role === 'employee' ? FileCheck2 : CalendarCheck2
  return (
    <div className={`harmony-glass-scene harmony-glass-scene-${role}`} aria-hidden="true">
      <div className="harmony-scene-halo" />
      <div className="harmony-scene-disc harmony-scene-disc-back" />
      <div className="harmony-scene-disc harmony-scene-disc-front" />
      <div className="harmony-scene-card harmony-scene-card-back"><ShieldCheck size={26} strokeWidth={1.5} /></div>
      <div className="harmony-scene-card harmony-scene-card-front">
        <div className="harmony-scene-card-top"><span /><span /><span /></div>
        <Icon size={62} strokeWidth={1.25} />
        <div className="harmony-scene-card-foot"><i /><i /><i /></div>
      </div>
      <div className="harmony-scene-orb harmony-scene-orb-a" />
      <div className="harmony-scene-orb harmony-scene-orb-b" />
    </div>
  )
}
