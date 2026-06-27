'use client'

import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const base =
  'relative inline-flex w-full items-center justify-center gap-2.5 rounded-3xl px-6 text-lg font-heading font-semibold tracking-tight shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50'

const variants = {
  primary: 'bg-primary text-primary-foreground shadow-primary/30',
  accent: 'bg-accent text-accent-foreground shadow-accent/40',
  surface: 'bg-card text-card-foreground border border-border shadow-foreground/5',
  ghost: 'bg-secondary text-secondary-foreground shadow-none',
}

const sizes = {
  md: 'h-13 min-h-13',
  lg: 'h-16 min-h-16 text-xl',
}

type Variant = keyof typeof variants
type Size = keyof typeof sizes

const MotionLink = motion.create(Link)

export function TactileLink({
  children,
  className,
  variant = 'primary',
  size = 'md',
  icon,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: Variant
  size?: Size
  icon?: ReactNode
}) {
  return (
    <MotionLink
      whileTap={{ scale: 0.96, y: 2 }}
      whileHover={{ y: -2 }}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {icon}
      {children}
    </MotionLink>
  )
}

export function TactileButton({
  children,
  className,
  variant = 'primary',
  size = 'md',
  icon,
  ...props
}: ComponentProps<typeof motion.button> & {
  variant?: Variant
  size?: Size
  icon?: ReactNode
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.96, y: 2 }}
      whileHover={{ y: -2 }}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {icon}
      {children}
    </motion.button>
  )
}
