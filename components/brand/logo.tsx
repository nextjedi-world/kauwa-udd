import { cn } from '@/lib/utils'

export function Logo({
  className,
  showWordmark = true,
  size = 'md',
}: {
  className?: string
  showWordmark?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const mark = {
    sm: 'size-8 text-xl',
    md: 'size-11 text-2xl',
    lg: 'size-16 text-4xl',
  }[size]

  const word = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  }[size]

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'grid place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-2 ring-background',
          mark,
        )}
        aria-hidden="true"
      >
        <span className="-rotate-6">🐦</span>
      </span>
      {showWordmark && (
        <span className={cn('font-heading font-bold leading-none tracking-tight', word)}>
          Kauwa <span className="text-primary">Udd</span>
        </span>
      )}
    </div>
  )
}
