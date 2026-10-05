import * as React from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'
type ButtonSize = 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-[#17181b] text-white shadow-[0_8px_20px_rgba(15,23,42,.12)] hover:bg-black hover:shadow-[0_10px_24px_rgba(15,23,42,.16)]',
  outline: 'border border-black/[0.08] bg-white text-[#25272c] shadow-sm hover:bg-[#f7f8fa]',
  secondary: 'bg-[#eef1f5] text-[#25272c] hover:bg-[#e7eaf0]',
  ghost: 'bg-transparent text-[#25272c] hover:bg-black/[0.045]',
  destructive: 'border border-red-100 bg-red-50 text-red-700 hover:bg-red-100',
  link: 'bg-transparent text-blue-600 underline-offset-4 hover:underline',
}

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-10 gap-2 px-4',
  xs: 'h-7 gap-1 px-2.5 text-xs',
  sm: 'h-9 gap-1.5 px-3 text-xs',
  lg: 'h-11 gap-2 px-5',
  icon: 'h-10 w-10',
  'icon-xs': 'h-7 w-7',
  'icon-sm': 'h-9 w-9',
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
        'inline-flex shrink-0 items-center justify-center rounded-[14px] text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
}
