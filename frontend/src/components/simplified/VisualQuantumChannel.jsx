import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Pause, SkipForward, RotateCcw, ChevronLeft, ChevronRight,
  Radio, Zap, ShieldCheck, ShieldAlert, Sparkles, Check, X, AlertTriangle, Eye
} from 'lucide-react'
import { getBB84State } from '../../lib/quantumStates'

export default function VisualQuantumChannel({
  bitStream = [],
  isLoading = false,
  eveEnabled = false,
  noiseLevel = 0,
  onRun = () => {},
  runCount = 0
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1) // 1x = 700ms, 2x = 350ms, 4x = 150ms
  const [animPhase, setAnimPhase] = useState('idle') // 'alice' -> 'channel' -> 'eve' -> 'bob' -> 'done'
  const [photonProgress, setPhotonProgress] = useState(0) // 0 to 1 along channel

  const animationFrameRef = useRef(null)
  const lastTimeRef = useRef(null)

  const totalPhotons = bitStream.length
  const currentPhoton = bitStream[currentIndex] || null

  // Auto-start playback whenever a new simulation run arrives
  useEffect(() => {
    if (bitStream.length > 0) {
      setCurrentIndex(0)
      setPhotonProgress(0)
      setIsPlaying(true)
    }
  }, [runCount, bitStream.length])

  // Speed in ms per full photon journey
  const getDuration = () => {
    if (speed === 4) return 200
    if (speed === 2) return 450
    return 850
  }

  // Animation loop
  useEffect(() => {
    if (!isPlaying || totalPhotons === 0 || isLoading) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      return
    }

    const duration = getDuration()
    lastTimeRef.current = performance.now()

    const step = (now) => {
      const delta = now - lastTimeRef.current
      lastTimeRef.current = now

      setPhotonProgress((prev) => {
        const next = prev + delta / duration
        if (next >= 1) {
          // Reached Bob! Advance to next photon
          setCurrentIndex((idx) => {
            if (idx + 1 >= totalPhotons) {
              setIsPlaying(false)
              return idx
            }
            return idx + 1
          })
          return 0
        }
        return next
      })

      animationFrameRef.current = requestAnimationFrame(step)
    }

    animationFrameRef.current = requestAnimationFrame(step)

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [isPlaying, currentIndex, totalPhotons, speed, isLoading])

  // Get current state info
  const aliceState = currentPhoton
    ? getBB84State(currentPhoton.alice_basis, currentPhoton.alice_bit)
    : null

  const isRectilinear = currentPhoton?.alice_basis === '+'
  const basisColor = isRectilinear ? 'text-emerald-400' : 'text-purple-400'
  const basisBg = isRectilinear ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-purple-500/20 border-purple-500/40'

  // Eve interaction
  const eveIntercepted = Boolean(currentPhoton?.intercepted || (eveEnabled && currentPhoton))
  const eveBasis = currentPhoton?.eve_basis || '?'
  const eveBasisMatchAlice = eveIntercepted && currentPhoton?.eve_basis === currentPhoton?.alice_basis
  const eveCollapsed = eveIntercepted && !eveBasisMatchAlice

  // Bob measurement
  const basisMatch = currentPhoton?.match ?? (currentPhoton?.alice_basis === currentPhoton?.bob_basis)
  const bitMatch = currentPhoton && currentPhoton.bob_bit === currentPhoton.alice_bit
  const isError = basisMatch && !bitMatch

  // Cumulative statistics up to currentIndex
  const cumulativeStats = () => {
    if (!bitStream.length) return { processed: 0, matched: 0, sifted: 0, errors: 0, qber: 0 }
    const processedSlice = bitStream.slice(0, currentIndex + 1)
    const matched = processedSlice.filter(p => p.match ?? (p.alice_basis === p.bob_basis)).length
    const errors = processedSlice.filter(p => (p.match ?? (p.alice_basis === p.bob_basis)) && p.bob_bit !== p.alice_bit).length
    const qber = matched > 0 ? ((errors / matched) * 100).toFixed(1) : '0.0'
    return {
      processed: processedSlice.length,
      matched,
      sifted: matched,
      errors,
      qber
    }
  }

  const stats = cumulativeStats()

  // Handle skip to end
  const handleSkipToEnd = () => {
    setIsPlaying(false)
    setCurrentIndex(Math.max(0, totalPhotons - 1))
    setPhotonProgress(1)
  }

  // Handle jump to specific index
  const handleJump = (idx) => {
    setCurrentIndex(idx)
    setPhotonProgress(0.5)
  }

  return (
    <div className="bg-[var(--q-surface-1)] border border-[var(--q-border)] rounded-xl p-5 shadow-sm space-y-4">
      {/* Header with Title and Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[var(--q-surface-2)] text-amber-400 font-mono text-xs flex items-center justify-center font-bold border border-[var(--q-border)]">
              2
            </span>
            <h2 className="text-base font-bold text-[var(--q-text-1)] flex items-center gap-2 font-body" style={{ fontFamily: 'var(--font-body)' }}>
              Section 2: Visual Quantum Simulator &amp; Channel Corridor
              {isPlaying && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  LIVE PHOTON FLIGHT
                </span>
              )}
            </h2>
          </div>
          <p className="text-xs text-[var(--q-text-3)] mt-0.5">
            Real-time photon polarization, quantum channel propagation, Eve interception, and Bob detection.
          </p>
        </div>

        {/* Live HUD Quick Counters */}
        {totalPhotons > 0 && (
          <div className="flex items-center gap-2 font-mono text-xs">
            <div className="bg-[var(--q-surface-2)] px-2.5 py-1 rounded border border-[var(--q-border)]">
              <span className="text-[var(--q-text-3)]">Qubit: </span>
              <span className="text-amber-400 font-bold">{currentIndex + 1}</span>
              <span className="text-[var(--q-text-4)]">/{totalPhotons}</span>
            </div>
            <div className="bg-[var(--q-surface-2)] px-2.5 py-1 rounded border border-[var(--q-border)]">
              <span className="text-[var(--q-text-3)]">Sifted: </span>
              <span className="text-blue-400 font-bold">{stats.sifted}</span>
            </div>
            <div className={`px-2.5 py-1 rounded border font-bold ${
              parseFloat(stats.qber) > 11
                ? 'bg-red-500/20 border-red-500/40 text-red-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              <span>QBER: {stats.qber}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Optical Bench Corridor */}
      <div className="relative rounded-xl border border-[var(--q-border-subtle)] bg-[#0a0a09] overflow-hidden p-4 md:p-6 shadow-inner">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #d99a62 1px, transparent 0)',
            backgroundSize: '24px 24px'
          }}
        />

        {totalPhotons === 0 ? (
          /* Empty / Standby State */
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/5">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            <div className="max-w-md">
              <h3 className="text-base font-bold text-[var(--q-text-1)]">
                Optical Bench Ready for Simulation
              </h3>
              <p className="text-xs text-[var(--q-text-3)] mt-1">
                Click <strong>"Run BB84 Simulation"</strong> above to fire polarized photons through the quantum corridor and observe key sifting in real time.
              </p>
            </div>
          </div>
        ) : (
          /* Active Simulation Corridor */
          <div className="relative z-10 space-y-6">
            {/* The 3-Node Optical Track: Alice -> Corridor/Eve -> Bob */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">

              {/* 1. ALICE PREPARATION STATION (3 cols) */}
              <div className="lg:col-span-3 bg-[var(--q-surface-1)] border border-emerald-500/30 rounded-xl p-3.5 flex flex-col justify-between shadow-md">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
                    <span className="text-xs font-mono font-bold text-emerald-400">Alice (Sender)</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    Laser Diode
                  </span>
                </div>

                <div className="my-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--q-text-3)]">Generated Bit:</span>
                    <span className="font-mono text-sm font-black text-emerald-300 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                      {currentPhoton?.alice_bit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--q-text-3)]">Chosen Basis:</span>
                    <span className="font-mono font-bold text-xs text-[var(--q-text-1)]">
                      {currentPhoton?.alice_basis === '+' ? '+ Rectilinear (0°/90°)' : '× Diagonal (45°/135°)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--q-text-3)]">Quantum State:</span>
                    <span className="font-mono font-bold text-sm text-amber-300">
                      {aliceState?.ket || (currentPhoton?.alice_state_label || '|?⟩')}
                    </span>
                  </div>
                </div>

                {/* Polarization Angle Compass */}
                <div className="pt-2 border-t border-[var(--q-border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--q-text-3)]">
                  <span>Polarization Angle:</span>
                  <span className="text-emerald-400 font-bold">
                    {aliceState?.angle ?? currentPhoton?.alice_polarization_angle ?? 0}°
                  </span>
                </div>
              </div>

              {/* 2. THE QUANTUM CHANNEL CORRIDOR WITH IN-FLIGHT PHOTON (6 cols) */}
              <div className="lg:col-span-6 bg-[#060606] border border-[var(--q-border)] rounded-xl p-4 relative min-h-[170px] flex flex-col justify-between overflow-hidden shadow-inner">
                {/* Channel Label Header */}
                <div className="flex items-center justify-between text-[10px] font-mono text-[var(--q-text-3)] border-b border-gray-900 pb-1 z-10">
                  <span className="flex items-center gap-1 text-cyan-400">
                    <Zap className="w-3 h-3 text-cyan-400" />
                    Optical Fiber Corridor (Free Space / Fiber Core)
                  </span>
                  <span>{noiseLevel > 0 ? `Noise: ${(noiseLevel * 100).toFixed(0)}%` : 'Noiseless Fiber'}</span>
                </div>

                {/* The Optical Track Line */}
                <div className="relative my-auto py-8">
                  {/* Glowing Fiber Core Centerline */}
                  <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500/40 via-cyan-500/30 to-purple-500/40 rounded-full relative overflow-hidden">
                    {/* Laser light pulse wave */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent w-1/3 animate-pulse"></div>
                  </div>

                  {/* EVE INTERCEPTION NODE IN THE CENTER (when Eve is active) */}
                  {eveEnabled && (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                      <div className={`p-2 rounded-xl border shadow-lg transition-all ${
                        photonProgress > 0.35 && photonProgress < 0.65
                          ? 'bg-red-500/30 border-red-500 ring-2 ring-red-500/50 scale-110'
                          : 'bg-red-950/70 border-red-500/40 opacity-80'
                      }`}>
                        <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-red-300">
                          <Eye className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                          <span>EVE</span>
                        </div>
                      </div>
                      <div className="text-[9px] font-mono text-red-400 mt-1 whitespace-nowrap bg-black/80 px-1 rounded border border-red-500/20">
                        Basis: <strong>{currentPhoton?.eve_basis || '?'}</strong> | Bit: <strong>{currentPhoton?.eve_bit ?? '?'}</strong>
                      </div>
                    </div>
                  )}

                  {/* FLYING PHOTON PARTICLE */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 z-30 transition-all duration-75 pointer-events-none"
                    style={{
                      left: `clamp(4%, ${photonProgress * 92}%, 92%)`
                    }}
                  >
                    <div className="relative flex flex-col items-center">
                      {/* Photon Wave Packet Glow */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                        isRectilinear
                          ? 'bg-emerald-500/30 border border-emerald-400 text-emerald-300 shadow-emerald-500/50'
                          : 'bg-purple-500/30 border border-purple-400 text-purple-300 shadow-purple-500/50'
                      }`}>
                        {/* Polarization vector indicator line */}
                        <div
                          className="w-5 h-0.5 bg-white rounded-full transition-transform"
                          style={{
                            transform: `rotate(${-(aliceState?.angle ?? 0)}deg)`
                          }}
                        />
                      </div>

                      {/* Quantum Ket Floating Tag */}
                      <span className="text-[10px] font-mono font-black text-amber-300 bg-black/90 px-1.5 py-0.2 rounded border border-amber-500/30 mt-1 shadow">
                        {aliceState?.ket || '|?⟩'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* State transformation indicator at bottom of corridor */}
                <div className="text-[11px] font-mono text-[var(--q-text-3)] text-center border-t border-gray-900 pt-1 z-10 flex items-center justify-between">
                  <span>Emission: Alice</span>
                  {eveEnabled ? (
                    <span className={eveCollapsed ? 'text-red-400 font-bold' : 'text-amber-400'}>
                      {photonProgress > 0.5
                        ? (eveCollapsed ? '⚠ Eve Mismatch → State Collapsed!' : '✓ Eve Basis Matched Alice')
                        : 'Photon approaching Eve...'}
                    </span>
                  ) : (
                    <span className="text-cyan-400">Coherent Photon Propagation</span>
                  )}
                  <span>Detection: Bob</span>
                </div>
              </div>

              {/* 3. BOB MEASUREMENT STATION (3 cols) */}
              <div className="lg:col-span-3 bg-[var(--q-surface-1)] border border-purple-500/30 rounded-xl p-3.5 flex flex-col justify-between shadow-md">
                <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-400"></div>
                    <span className="text-xs font-mono font-bold text-purple-400">Bob (Receiver)</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                    Beam Splitter
                  </span>
                </div>

                <div className="my-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--q-text-3)]">Chosen Basis:</span>
                    <span className="font-mono font-bold text-xs text-[var(--q-text-1)]">
                      {currentPhoton?.bob_basis === '+' ? '+ Rectilinear' : '× Diagonal'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--q-text-3)]">Measured Bit:</span>
                    <span className="font-mono text-sm font-black text-purple-300 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30">
                      {currentPhoton?.bob_bit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--q-text-3)]">Basis Match:</span>
                    <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded border ${
                      basisMatch
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}>
                      {basisMatch ? '✓ MATCH (Keep)' : '✗ MISMATCH (Discard)'}
                    </span>
                  </div>
                </div>

                {/* Sifting Outcome */}
                <div className="pt-2 border-t border-[var(--q-border-subtle)] flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[var(--q-text-3)]">Sifted Status:</span>
                  {basisMatch ? (
                    bitMatch ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Secure Bit
                      </span>
                    ) : (
                      <span className="text-red-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Bit Error!
                      </span>
                    )
                  ) : (
                    <span className="text-gray-500 font-semibold">Discarded</span>
                  )}
                </div>
              </div>

            </div>

            {/* Explanation Callout for Current Photon */}
            <div className={`p-3 rounded-xl border text-xs font-mono transition-colors ${
              isError
                ? 'bg-red-950/30 border-red-500/50 text-red-200'
                : basisMatch
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                  : 'bg-[var(--q-surface-2)] border-[var(--q-border)] text-[var(--q-text-3)]'
            }`}>
              <div className="flex items-start gap-2">
                <div className="mt-0.5">
                  {isError ? (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  ) : basisMatch ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <X className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold text-[var(--q-text-1)]">
                    Photon #{currentIndex + 1} Physics Narrative:
                  </div>
                  <div>
                    Alice prepared <strong>bit {currentPhoton?.alice_bit}</strong> in <strong>{currentPhoton?.alice_basis}</strong> basis ({aliceState?.ket || '|?⟩'}).
                    {eveEnabled ? (
                      eveBasisMatchAlice ? (
                        <span> Eve intercepted with matching basis ({currentPhoton?.eve_basis}) — state was not disturbed.</span>
                      ) : (
                        <span className="text-red-300"> ⚠ Eve intercepted with wrong basis ({currentPhoton?.eve_basis}) causing wavefunction collapse to {currentPhoton?.eve_bit}!</span>
                      )
                    ) : (
                      <span> Traveled through secure channel without eavesdropping.</span>
                    )}
                    {' '}Bob measured in <strong>{currentPhoton?.bob_basis}</strong> basis and obtained <strong>bit {currentPhoton?.bob_bit}</strong>.
                    {' '}<strong>
                      {basisMatch
                        ? (bitMatch
                            ? 'Bases match! Bit preserved without error → added to sifted key.'
                            : 'Bases match but bits differ! An error was detected (Eve or noise caught!).')
                        : 'Bases differ! Photon discarded during public basis announcement.'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Playback Controls & Progress Bar */}
            <div className="bg-[var(--q-surface-2)] border border-[var(--q-border)] rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Play / Step Buttons */}
              <div className="flex items-center gap-1.5 w-full md:w-auto justify-center">
                <button
                  type="button"
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  className="p-2 rounded-lg border border-[var(--q-border)] bg-[var(--q-surface-1)] hover:bg-[var(--q-surface-active)] text-[var(--q-text-2)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Previous Photon"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                    isPlaying
                      ? 'bg-amber-500 hover:bg-amber-400 text-gray-950 shadow-md shadow-amber-500/20'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{currentIndex >= totalPhotons - 1 ? 'Replay' : 'Play Flight'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentIndex(Math.min(totalPhotons - 1, currentIndex + 1))}
                  disabled={currentIndex >= totalPhotons - 1}
                  className="p-2 rounded-lg border border-[var(--q-border)] bg-[var(--q-surface-1)] hover:bg-[var(--q-surface-active)] text-[var(--q-text-2)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Next Photon"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleSkipToEnd}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-[var(--q-border)] bg-[var(--q-surface-1)] hover:bg-[var(--q-surface-active)] text-[var(--q-text-2)] text-xs font-mono cursor-pointer"
                  title="Skip to End"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Skip to End</span>
                </button>
              </div>

              {/* Scrubber Slider */}
              <div className="flex-1 w-full flex items-center gap-2">
                <span className="text-[11px] font-mono text-[var(--q-text-3)] min-w-[32px]">
                  #{currentIndex + 1}
                </span>
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, totalPhotons - 1)}
                  value={currentIndex}
                  onChange={(e) => handleJump(parseInt(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <span className="text-[11px] font-mono text-[var(--q-text-3)] min-w-[32px] text-right">
                  #{totalPhotons}
                </span>
              </div>

              {/* Speed Buttons */}
              <div className="flex items-center gap-1">
                {[
                  { label: '1x', val: 1 },
                  { label: '2x', val: 2 },
                  { label: '4x', val: 4 },
                ].map(s => (
                  <button
                    key={s.val}
                    type="button"
                    onClick={() => setSpeed(s.val)}
                    className={`px-2 py-1 rounded text-xs font-mono cursor-pointer transition-colors ${
                      speed === s.val
                        ? 'bg-amber-500 text-gray-950 font-bold'
                        : 'bg-[var(--q-surface-1)] text-[var(--q-text-3)] hover:text-[var(--q-text-1)] border border-[var(--q-border)]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Photon Mini-Tape */}
            <div className="pt-1">
              <div className="text-[11px] font-mono text-[var(--q-text-3)] mb-1.5 flex items-center justify-between">
                <span>Recent Photons Sliding Tape:</span>
                <span>Click any badge to inspect</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {bitStream.slice(Math.max(0, currentIndex - 5), Math.min(totalPhotons, currentIndex + 6)).map((p, idx) => {
                  const actualIdx = Math.max(0, currentIndex - 5) + idx
                  const isCurrent = actualIdx === currentIndex
                  const pMatch = p.match ?? (p.alice_basis === p.bob_basis)
                  const pError = pMatch && p.bob_bit !== p.alice_bit

                  return (
                    <button
                      key={actualIdx}
                      type="button"
                      onClick={() => handleJump(actualIdx)}
                      className={`px-2 py-1 rounded border font-mono text-[10px] flex-shrink-0 flex items-center gap-1 transition-all cursor-pointer ${
                        isCurrent
                          ? 'ring-2 ring-amber-400 bg-amber-500/20 border-amber-500 text-amber-200 font-bold scale-105'
                          : pError
                            ? 'bg-red-500/10 border-red-500/30 text-red-300'
                            : pMatch
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                              : 'bg-[var(--q-surface-2)] border-[var(--q-border)] text-gray-400 opacity-60'
                      }`}
                    >
                      <span>#{actualIdx + 1}</span>
                      <span>[{p.alice_basis}/{p.bob_basis}]</span>
                      {pError ? (
                        <span className="text-red-400">⚠ Err</span>
                      ) : pMatch ? (
                        <span className="text-emerald-400">✓ Sift</span>
                      ) : (
                        <span className="text-gray-500">✗</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
