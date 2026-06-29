'use client'

import { useState } from 'react'
import { SkyBackdrop } from '@/components/brand/sky-backdrop'
import { GameScreen } from '@/components/screens/game-screen'
import { SoloSetup } from '@/components/screens/solo-setup'
import type { SoloPrefs } from '@/lib/prefs'

export default function GamePage() {
  const [config, setConfig] = useState<SoloPrefs | null>(null)

  return (
    <>
      <SkyBackdrop />
      {config ? (
        <GameScreen
          solo={{ rounds: config.rounds, announce: config.announce, language: config.language }}
        />
      ) : (
        <SoloSetup onStart={setConfig} />
      )}
    </>
  )
}
