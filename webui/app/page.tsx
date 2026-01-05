"use client"

import { useState, useEffect } from 'react'
import GameFileBrowser from '@/components/game-file-browser'

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return <GameFileBrowser />
}
