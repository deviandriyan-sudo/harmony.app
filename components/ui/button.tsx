import * as React from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'
type ButtonSize = 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-[#1d1d1f] text-white hover:bg-black',
  outline: 'border border-black/10 bg-white text-[#1d1d1f] hover:bg-[#f5f5f7]',
  secondary: 'bg-[#f0f0f2] text-[#1d1d1f] hover:bg-[#e5e5e7]',
  ghost: 'bg-transparent text-[#1d1d1f] hover:bg-black/5',
  destructive: 'bg-red-50 text-red-600 hover:bg-red-100',
  link: 'bg-transparent text-[#007aff] underline-offset-4 hover:underline',
}

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-9 gap-2 px-3',
  xs: 'h-7 gap-1 px-2 text-xs',
  sm: 'h-8 gap-1.5 px-2.5 text-xs',
  lg: 'h-11 gap-2 px-4',
  icon: 'h-9 w-9',
  'icon-xs': 'h-7 w-7',
  'icon-sm': 'h-8 w-8',
  'icon-lg': 'h-11 w-11',
}

export function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}) {
  return (
    <button
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
}
