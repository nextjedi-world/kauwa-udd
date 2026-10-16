'use client'

import { motion } from 'framer-motion'

const FLOATERS = [
  { emoji: '☁️', left: '8%', top: '12%', size: 'text-5xl', delay: 0, dur: 7 },
  { emoji: '🪶', left: '78%', top: '18%', size: 'text-3xl', delay: 1.2, dur: 6 },
  { emoji: '☁️', left: '62%', top: '8%', size: 'text-4xl', delay: 0.6, dur: 8 },
  { emoji: '🪶', left: '18%', top: '70%', size: 'text-2xl', delay: 2, dur: 5.5 },
  { emoji: '☁️', left: '84%', top: '64%', size: 'text-5xl', delay: 1.6, dur: 9 },
  { emoji: '🪶', left: '44%', top: '82%', size: 'text-3xl', delay: 0.3, dur: 6.5 },
]

export function SkyBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-sky"
    >
      {FLOATERS.map((f, i) => (
        <motion.span
          key={i}
          className={`absolute select-none opacity-40 ${f.size}`}
          style={{ left: f.left, top: f.top }}
          animate={{ y: [0, -22, 0], rotate: [-6, 8, -6] }}
          transition={{
            duration: f.dur,
            delay: f.delay,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
          }}
        >
          {f.emoji}
        </motion.span>
      ))}
    </div>
  )
}
