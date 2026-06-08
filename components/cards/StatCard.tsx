import { LucideIcon } from 'lucide-react'

type StatCardProps = {
  title: string
  value: string
  description: string
  icon: LucideIcon
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: StatCardProps) {
  return (
    <div className="harmony-card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[#6e6e73]">
            {title}
          </p>
          <h3 className="mt-3 text-3xl font-semibold tracking-tight text-[#1d1d1f]">
            {value}
          </h3>
          <p className="mt-2 text-sm text-[#6e6e73]">
            {description}
          </p>
        </div>

        <div className="rounded-2xl bg-[#f5f5f7] p-3 text-[#007aff]">
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}