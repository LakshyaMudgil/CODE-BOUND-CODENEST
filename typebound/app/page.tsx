'use client'

import { useEffect, useState } from 'react'

export default function Page() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreen)
    return () => document.removeEventListener('fullscreenchange', onFullscreen)
  }, [])

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }
    await document.documentElement.requestFullscreen()
  }

  return (
    <main className="typebound-shell">
      <header className="typebound-header">
        <div>
          <p className="eyebrow">CODENEST ARCADE // BUILD 02</p>
          <h1>TYPEBOUND</h1>
          <p className="tagline">Words are weapons. Timing is survival.</p>
        </div>
        <div className="header-actions">
          <span className="status-dot" aria-label="Game ready">LIVE</span>
          <button className="fullscreen-button" type="button" onClick={toggleFullscreen}>
            {isFullscreen ? 'Exit focus mode' : 'Focus mode'}
          </button>
        </div>
      </header>
      <section className="game-frame" aria-label="Typebound game">
        <iframe title="Typebound typing combat game" src="/typebound/index.html" />
      </section>
      <footer className="typebound-footer">
        <span>Defeat the Glitched Knight</span>
        <span>Type letters to attack · Arrow keys to move · Shift to parry · Space to dodge</span>
      </footer>
    </main>
  )
}
