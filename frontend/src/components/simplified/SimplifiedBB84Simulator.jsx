/**
 * SimplifiedBB84Simulator.jsx
 *
 * Core Interactive BB84 Quantum Key Distribution (QKD) Simulator
 * for College Quantum Computing Projects.
 *
 * Organized into 5 distinct, pedagogical sections:
 * 1. Simulation Controls (Qubits, Eve toggle, Noise level, 3 Scenarios, Run & Reset)
 * 2. Protocol Visualization (Alice → Channel → Bob or Alice → Eve → Bob)
 * 3. Transmission Table (Qubit-by-qubit inspection of bits, bases, matches, and sifting)
 * 4. Key and Security Analysis (Sifted key, test bits, QBER, acceptance/rejection, OTP demo)
 * 5. One QBER Chart (Multi-scenario comparison with 11% security threshold)
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, RotateCcw, ShieldCheck, ShieldAlert, AlertTriangle,
  Radio, Cpu, ArrowRight, Download, CheckCircle2, XCircle,
  HelpCircle, Lock, Unlock, Sparkles, Filter, ChevronLeft, ChevronRight
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell
} from 'recharts'
import useSimulationStore from '../../store/simulationStore'
import { useSimulation } from '../../hooks/useSimulation'
import { getOtpDemoState } from '../../lib/otpDemo'
import VisualQuantumChannel from './VisualQuantumChannel'

const SECURITY_THRESHOLD = 0.11 // 11% theoretical BB84 security limit

export default function SimplifiedBB84Simulator() {
  const { results, params, setParams } = useSimulationStore()
  const { runSimulation, resetSimulation, isLoading, error } = useSimulation()

  // Local UI states
  const [selectedScenario, setSelectedScenario] = useState('ideal') // 'ideal' | 'eve' | 'noise'
  const [tableFilter, setTableFilter] = useState('all') // 'all' | 'matching' | 'discarded' | 'test' | 'errors'
  const [tablePage, setTablePage] = useState(0)
  const [runCount, setRunCount] = useState(0)
  const pageSize = 20

  // OTP Demo state
  const [otpMessage, setOtpMessage] = useState('BB84')

  const handleRunSimulation = async () => {
    setTablePage(0)
    setRunCount((c) => c + 1)
    await runSimulation()
  }

  const handleResetSimulation = () => {
    setTablePage(0)
    resetSimulation()
  }

  // Current parameters
  const nBits = params.n_bits || 50
  const eveEnabled = Boolean(params.eve_enabled || params.attack_prob > 0)
  const noiseLevel = params.noise_level ?? 0.0

  // Handle Scenario Quick Presets
  const applyScenario = (scenario) => {
    setSelectedScenario(scenario)
    if (scenario === 'ideal') {
      setParams({
        n_bits: Math.max(50, nBits),
        eve_enabled: false,
        attack_prob: 0.0,
        attack_strategy: 'intercept_resend',
        noise_level: 0.0,
        distance_km: 0.0,
      })
    } else if (scenario === 'eve') {
      setParams({
        n_bits: Math.max(50, nBits),
        eve_enabled: true,
        attack_prob: 1.0,
        attack_strategy: 'intercept_resend',
        noise_level: 0.0,
        distance_km: 0.0,
      })
    } else if (scenario === 'noise') {
      setParams({
        n_bits: Math.max(50, nBits),
        eve_enabled: false,
        attack_prob: 0.0,
        attack_strategy: 'intercept_resend',
        noise_level: 0.12,
        distance_km: 0.0,
      })
    }
  }

  // Handle manual Eve toggle
  const handleEveToggle = () => {
    const nextEve = !eveEnabled
    setParams({
      eve_enabled: nextEve,
      attack_prob: nextEve ? 1.0 : 0.0,
      attack_strategy: 'intercept_resend',
    })
    setSelectedScenario(nextEve ? 'eve' : (noiseLevel > 0 ? 'noise' : 'ideal'))
  }

  // Handle manual noise change
  const handleNoiseChange = (e) => {
    const val = parseFloat(e.target.value)
    setParams({ noise_level: val })
    if (val > 0 && !eveEnabled) {
      setSelectedScenario('noise')
    } else if (val === 0 && !eveEnabled) {
      setSelectedScenario('ideal')
    }
  }

  // Handle manual qubits change
  const handleQubitsChange = (val) => {
    setParams({ n_bits: val })
  }

  // Export Results
  const exportResultsJSON = () => {
    if (!results) return
    const exportData = {
      timestamp: new Date().toISOString(),
      parameters: {
        n_bits: nBits,
        eve_enabled: eveEnabled,
        noise_level: noiseLevel,
      },
      summary: {
        raw_key_length: results.raw_key_length,
        sifted_key_length: results.sifted_key_length,
        qber_percent: results.qber !== null ? (results.qber * 100).toFixed(2) + '%' : 'Not estimated',
        test_sample_size: results.qber_sample_size,
        errors_in_sample: results.qber_sample_errors,
        secure_threshold_breached: results.secure_threshold_breached,
        key_accepted: !results.key_exchange_aborted,
        candidate_key_length: results.post_sample_key_length,
      },
      bit_stream_records: results.bit_stream || []
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bb84_simulation_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Bit stream rows for Transmission Table
  const bitStream = useMemo(() => {
    if (!results?.bit_stream) return []
    return results.bit_stream.map((r, idx) => {
      const match = r.match ?? (r.alice_basis === r.bob_basis)
      const isTest = Boolean(r.is_test_bit)
      const retained = Boolean(r.retained_in_key)
      const errorInBit = match && r.bob_bit !== null && r.bob_bit !== r.alice_bit
      return {
        ...r,
        index: r.index ?? idx,
        match,
        isTest,
        retained,
        errorInBit
      }
    })
  }, [results])

  // Filtered bit stream
  const filteredRows = useMemo(() => {
    if (!bitStream.length) return []
    return bitStream.filter((r) => {
      if (tableFilter === 'matching') return r.match
      if (tableFilter === 'discarded') return !r.match
      if (tableFilter === 'test') return r.isTest
      if (tableFilter === 'errors') return r.errorInBit
      return true
    })
  }, [bitStream, tableFilter])

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1
  const displayedRows = useMemo(() => {
    const start = tablePage * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, tablePage, pageSize])

  // Key and Security analysis data
  const qberPercent = results?.qber !== null && results?.qber !== undefined
    ? (results.qber * 100).toFixed(1)
    : (results?.qber_preview !== null && results?.qber_preview !== undefined
        ? (results.qber_preview * 100).toFixed(1) + ' (preview)'
        : '—')

  const isBreached = results?.secure_threshold_breached ?? false
  const isAborted = results?.key_exchange_aborted ?? false
  const isKeyAccepted = results && !isAborted && !isBreached && results.qber !== null && results.qber < SECURITY_THRESHOLD
  const isSmallSample = results?.qber_sample_size > 0 && results?.qber_sample_size < 35

  // OTP Demo computation
  const otpState = useMemo(() => getOtpDemoState(results), [results])
  const candidateKeyBits = results?.post_sample_key || []

  const otpOutput = useMemo(() => {
    if (!otpMessage || !candidateKeyBits.length) return null
    const maxChars = Math.floor(candidateKeyBits.length / 8)
    const validMsg = otpMessage.slice(0, Math.max(1, maxChars))
    const chars = validMsg.split('')

    const encRows = chars.map((char, i) => {
      const charCode = char.charCodeAt(0)
      const msgBinary = charCode.toString(2).padStart(8, '0')
      const keySlice = candidateKeyBits.slice(i * 8, (i + 1) * 8).join('')
      if (keySlice.length < 8) return null
      const encrypted = msgBinary.split('').map((b, idx) => b === keySlice[idx] ? '0' : '1').join('')
      const decryptedBinary = encrypted.split('').map((b, idx) => b === keySlice[idx] ? '0' : '1').join('')
      const decryptedChar = String.fromCharCode(parseInt(decryptedBinary, 2))
      return { char, msgBinary, keySlice, encrypted, decryptedChar }
    }).filter(Boolean)

    return {
      validMsg,
      maxChars,
      encRows,
      ciphertext: encRows.map(r => r.encrypted).join(' '),
      decryptedText: encRows.map(r => r.decryptedChar).join(''),
    }
  }, [otpMessage, candidateKeyBits])

  // Section 5 Chart Data: Comparison across the 3 scenarios
  const chartData = useMemo(() => {
    const measuredVal = results?.qber !== null && results?.qber !== undefined
      ? parseFloat((results.qber * 100).toFixed(1))
      : (results?.qber_preview !== null && results?.qber_preview !== undefined
          ? parseFloat((results.qber_preview * 100).toFixed(1))
          : null)

    return [
      {
        scenario: 'Scenario 1: Ideal Channel',
        description: 'No Eve, No Noise',
        expectedQBER: 0.0,
        fillColor: '#10b981', // emerald
      },
      {
        scenario: 'Scenario 2: Eve Intercept',
        description: 'Eve Enabled (50% wrong basis × 50% Bob error)',
        expectedQBER: 25.0,
        fillColor: '#ef4444', // red
      },
      {
        scenario: 'Scenario 3: Channel Noise',
        description: `Configured Noise (${(noiseLevel * 100).toFixed(0)}%)`,
        expectedQBER: parseFloat((noiseLevel * 100).toFixed(1)),
        fillColor: '#f59e0b', // amber
      },
      ...(measuredVal !== null ? [{
        scenario: 'Current Run (Measured)',
        description: `${eveEnabled ? 'Eve ON' : 'Eve OFF'}, Noise: ${(noiseLevel * 100).toFixed(0)}%`,
        expectedQBER: measuredVal,
        fillColor: isBreached ? '#dc2626' : '#3b82f6', // blue or deep red
      }] : [])
    ]
  }, [results, noiseLevel, eveEnabled, isBreached])

  return (
    <div className="w-full h-full overflow-y-auto px-4 py-6 md:px-8 space-y-8 max-w-7xl mx-auto text-[var(--q-text-1)]">

      {/* ─── APP TITLE & SCENARIO HERO BAR ─── */}
      <div className="bg-[var(--q-surface-1)] border border-[var(--q-border)] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                B.Tech Quantum Computing Lab
              </span>
              <span className="text-xs text-[var(--q-text-3)] font-mono">
                Bennett-Brassard 1984 Protocol
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight mt-1 text-[var(--q-text-1)]">
              BB84 Quantum Key Distribution Simulator
            </h1>
            <p className="text-sm text-[var(--q-text-2)] mt-0.5">
              Simulate quantum key exchange between Alice & Bob, inspect basis sifting, and observe how Eve's eavesdropping induces detectable quantum errors.
            </p>
          </div>

          {/* Quick Simulation Status Badge */}
          {results && (
            <div className={`px-4 py-2.5 rounded-lg border text-sm font-medium flex items-center gap-2 ${
              isKeyAccepted
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}>
              {isKeyAccepted ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <div className="font-bold leading-tight">Key Established Safely</div>
                    <div className="text-xs opacity-80">QBER {qberPercent}% &lt; 11% threshold</div>
                  </div>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <div>
                    <div className="font-bold leading-tight">Key Rejected / Aborted</div>
                    <div className="text-xs opacity-80">
                      {isBreached ? `QBER ${qberPercent}% exceeds 11% threshold!` : 'Security could not be certified'}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: SIMULATION CONTROLS
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-[var(--q-surface-1)] border border-[var(--q-border)] rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--q-border-subtle)] gap-2">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 text-[var(--q-text-1)]">
              <span className="w-6 h-6 rounded-full bg-[var(--q-surface-2)] text-amber-400 font-mono text-xs flex items-center justify-center font-bold border border-[var(--q-border)]">
                1
              </span>
              Section 1: Simulation Controls
            </h2>
            <p className="text-xs text-[var(--q-text-3)] mt-0.5">
              Select one of the 3 key educational scenarios or customize quantum transmission parameters.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {results && (
              <button
                onClick={exportResultsJSON}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--q-border)] bg-[var(--q-surface-2)] hover:bg-[var(--q-surface-active)] text-xs text-[var(--q-text-2)] hover:text-[var(--q-text-1)] transition-colors"
                title="Export current simulation data to JSON"
              >
                <Download className="w-3.5 h-3.5" />
                Export JSON
              </button>
            )}
          </div>
        </div>

        {/* 3 Quick Demonstration Scenarios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Scenario 1 */}
          <button
            onClick={() => applyScenario('ideal')}
            className={`text-left p-4 rounded-xl border transition-all ${
              selectedScenario === 'ideal' && !eveEnabled && noiseLevel === 0
                ? 'border-emerald-500/50 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/30'
                : 'border-[var(--q-border)] bg-[var(--q-surface-2)] hover:border-[var(--q-border-strong)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-400">Scenario 1</span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-emerald-500/20 text-emerald-300">
                0% QBER
              </span>
            </div>
            <div className="text-sm font-bold text-[var(--q-text-1)] mt-1">
              Ideal Clean Channel
            </div>
            <p className="text-xs text-[var(--q-text-3)] mt-1 leading-relaxed">
              Eve disabled, 0% channel noise. Alice & Bob establish a shared secret key with 0 errors on matching bases.
            </p>
          </button>

          {/* Scenario 2 */}
          <button
            onClick={() => applyScenario('eve')}
            className={`text-left p-4 rounded-xl border transition-all ${
              selectedScenario === 'eve' || eveEnabled
                ? 'border-red-500/50 bg-red-500/10 shadow-sm ring-1 ring-red-500/30'
                : 'border-[var(--q-border)] bg-[var(--q-surface-2)] hover:border-[var(--q-border-strong)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-red-400">Scenario 2</span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-red-500/20 text-red-300">
                ~25% QBER
              </span>
            </div>
            <div className="text-sm font-bold text-[var(--q-text-1)] mt-1">
              Eve Eavesdropping
            </div>
            <p className="text-xs text-[var(--q-text-3)] mt-1 leading-relaxed">
              Eve intercepts and resends photons in random bases. Quantum collapse introduces ~25% error rate, revealing her!
            </p>
          </button>

          {/* Scenario 3 */}
          <button
            onClick={() => applyScenario('noise')}
            className={`text-left p-4 rounded-xl border transition-all ${
              selectedScenario === 'noise' && !eveEnabled && noiseLevel > 0
                ? 'border-amber-500/50 bg-amber-500/10 shadow-sm ring-1 ring-amber-500/30'
                : 'border-[var(--q-border)] bg-[var(--q-surface-2)] hover:border-[var(--q-border-strong)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-400">Scenario 3</span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-amber-500/20 text-amber-300">
                Noise = {(noiseLevel * 100).toFixed(0)}%
              </span>
            </div>
            <div className="text-sm font-bold text-[var(--q-text-1)] mt-1">
              Channel Noise
            </div>
            <p className="text-xs text-[var(--q-text-3)] mt-1 leading-relaxed">
              No eavesdropper, but environmental thermal/optical noise flips photons. Demonstrates noise impact.
            </p>
          </button>
        </div>

        {/* Detailed Controls Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Number of Qubits */}
          <div className="bg-[var(--q-surface-2)] border border-[var(--q-border)] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--q-text-2)]">
                Number of Qubits (N)
              </label>
              <span className="text-sm font-mono font-bold text-amber-400">
                {nBits}
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="500"
              step="5"
              value={nBits}
              onChange={(e) => handleQubitsChange(parseInt(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[11px] text-[var(--q-text-3)] mr-1">Presets:</span>
              {[16, 32, 50, 100, 200].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleQubitsChange(preset)}
                  className={`px-2 py-0.5 text-xs font-mono rounded border transition-colors ${
                    nBits === preset
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-[var(--q-surface-1)] border-[var(--q-border)] text-[var(--q-text-3)] hover:text-[var(--q-text-1)]'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Eve Eavesdropper Toggle */}
          <div className={`border rounded-xl p-4 flex flex-col justify-between transition-colors ${
            eveEnabled
              ? 'bg-red-500/10 border-red-500/40'
              : 'bg-[var(--q-surface-2)] border-[var(--q-border)]'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-[var(--q-text-2)] flex items-center gap-1.5">
                  <Radio className={`w-3.5 h-3.5 ${eveEnabled ? 'text-red-400 animate-pulse' : 'text-gray-400'}`} />
                  Eve Eavesdropper
                </label>
                <div className="text-[11px] text-[var(--q-text-3)] mt-0.5">
                  {eveEnabled ? 'Intercept-and-Resend attack active' : 'Passive / No eavesdropping'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleEveToggle}
                className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none ${
                  eveEnabled ? 'bg-red-500' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    eveEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="mt-3 text-xs font-mono">
              <span className={`px-2 py-0.5 rounded border inline-block text-[11px] ${
                eveEnabled
                  ? 'bg-red-500/20 border-red-500/40 text-red-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}>
                {eveEnabled ? 'INTERCEPT & RESEND ON' : 'EVE OFF (SECURE CHANNEL)'}
              </span>
            </div>
          </div>

          {/* Noise Level Slider */}
          <div className="bg-[var(--q-surface-2)] border border-[var(--q-border)] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--q-text-2)]">
                Channel Noise Level
              </label>
              <span className="text-sm font-mono font-bold text-amber-400">
                {(noiseLevel * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="0.30"
              step="0.01"
              value={noiseLevel}
              onChange={handleNoiseChange}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex items-center justify-between text-[11px] text-[var(--q-text-3)]">
              <span>0% (Ideal Channel)</span>
              <span>15%</span>
              <span>30% (High Noise)</span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Run Simulation & Reset */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={handleRunSimulation}
            disabled={isLoading}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-950 shadow-md hover:shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>{isLoading ? 'Simulating BB84 Quantum Transmission...' : 'Run BB84 Simulation'}</span>
          </button>

          <button
            onClick={handleResetSimulation}
            disabled={isLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm border border-[var(--q-border)] bg-[var(--q-surface-2)] hover:bg-[var(--q-surface-active)] text-[var(--q-text-2)] hover:text-[var(--q-text-1)] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Simulation</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: VISUAL QUANTUM SIMULATOR & CHANNEL CORRIDOR
          ───────────────────────────────────────────────────────────── */}
      <section id="section-2-visual-simulator" className="space-y-4">
        <VisualQuantumChannel
          bitStream={bitStream}
          isLoading={isLoading}
          eveEnabled={eveEnabled}
          noiseLevel={noiseLevel}
          onRun={handleRunSimulation}
          runCount={runCount}
        />

        {/* Theoretical State Reference Bar */}
        <div className="bg-[var(--q-surface-1)] border border-[var(--q-border)] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-[var(--q-text-2)] border-b border-[var(--q-border-subtle)] pb-2 mb-3">
            <span>BB84 Polarization Basis States Reference:</span>
            <span className="text-[10px] text-[var(--q-text-3)] font-normal">Mutually Unbiased Bases (MUB)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="bg-[var(--q-surface-2)] p-2 rounded border border-emerald-500/20 text-center">
              <span className="text-[var(--q-text-3)]">+ &amp; Bit 0 → </span>
              <span className="text-emerald-400 font-bold">|0⟩ (0° H)</span>
            </div>
            <div className="bg-[var(--q-surface-2)] p-2 rounded border border-emerald-500/20 text-center">
              <span className="text-[var(--q-text-3)]">+ &amp; Bit 1 → </span>
              <span className="text-emerald-400 font-bold">|1⟩ (90° V)</span>
            </div>
            <div className="bg-[var(--q-surface-2)] p-2 rounded border border-purple-500/20 text-center">
              <span className="text-[var(--q-text-3)]">× &amp; Bit 0 → </span>
              <span className="text-purple-400 font-bold">|+⟩ (45° D+)</span>
            </div>
            <div className="bg-[var(--q-surface-2)] p-2 rounded border border-purple-500/20 text-center">
              <span className="text-[var(--q-text-3)]">× &amp; Bit 1 → </span>
              <span className="text-purple-400 font-bold">|-⟩ (135° D-)</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: TRANSMISSION TABLE
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-[var(--q-surface-1)] border border-[var(--q-border)] rounded-xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 text-[var(--q-text-1)]">
              <span className="w-6 h-6 rounded-full bg-[var(--q-surface-2)] text-amber-400 font-mono text-xs flex items-center justify-center font-bold border border-[var(--q-border)]">
                3
              </span>
              Section 3: Transmission Table
            </h2>
            <p className="text-xs text-[var(--q-text-3)] mt-0.5">
              Qubit-by-qubit inspection showing Alice's state, Eve's intercept (when ON), Bob's measurement, basis matching, and key sifting.
            </p>
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[var(--q-surface-2)] p-1 rounded-lg border border-[var(--q-border)]">
            {[
              { id: 'all', label: `All (${bitStream.length})` },
              { id: 'matching', label: 'Matching Bases' },
              { id: 'discarded', label: 'Discarded' },
              { id: 'test', label: 'Test Bits' },
              { id: 'errors', label: 'Errors Detected' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => { setTableFilter(f.id); setTablePage(0); }}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                  tableFilter === f.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-[var(--q-text-3)] hover:text-[var(--q-text-1)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Educational Callout */}
        <div className="p-3 rounded-lg bg-[var(--q-surface-2)] border border-[var(--q-border)] text-xs text-[var(--q-text-2)] flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Simulation / Debugging View:</strong> In physical QKD, Alice and Bob never publish their raw bit values over the classical channel. They only compare their <em>bases</em> (+ or ×) to identify matching positions. Bit values are displayed here solely for student inspection and verification.
          </p>
        </div>

        {/* Table Container */}
        {bitStream.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[var(--q-border)] rounded-xl text-sm text-[var(--q-text-3)]">
            Click <strong>"Run BB84 Simulation"</strong> above to view the transmission table.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-[var(--q-border)]">
              <table className="w-full text-left text-xs font-mono divide-y divide-[var(--q-border)]">
                <thead className="bg-[var(--q-surface-2)] text-[var(--q-text-2)] font-semibold">
                  <tr>
                    <th className="py-2.5 px-3"># Pos</th>
                    <th className="py-2.5 px-3">Alice Bit</th>
                    <th className="py-2.5 px-3">Alice Basis</th>
                    {eveEnabled && <th className="py-2.5 px-3 text-red-400">Eve Basis &amp; Bit</th>}
                    <th className="py-2.5 px-3">Bob Basis</th>
                    <th className="py-2.5 px-3">Bob Result</th>
                    <th className="py-2.5 px-3">Basis Match?</th>
                    <th className="py-2.5 px-3">Sifted?</th>
                    <th className="py-2.5 px-3">Key Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--q-border-subtle)] bg-[var(--q-surface-1)]">
                  {displayedRows.map((r, i) => {
                    const isError = r.match && r.bob_bit !== null && r.bob_bit !== r.alice_bit
                    return (
                      <tr
                        key={r.index ?? i}
                        className={`hover:bg-[var(--q-surface-2)]/60 transition-colors ${
                          isError ? 'bg-red-500/10' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-[var(--q-text-3)]">
                          {(r.index ?? i) + 1}
                        </td>
                        <td className="py-2 px-3 font-bold text-emerald-400">
                          {r.alice_bit}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded ${r.alice_basis === '+' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                            {r.alice_basis}
                          </span>
                        </td>
                        {eveEnabled && (
                          <td className="py-2 px-3 text-red-300 font-semibold">
                            {r.eve_basis ? `${r.eve_basis} [${r.eve_bit}]` : '—'}
                          </td>
                        )}
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded ${r.bob_basis === '+' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                            {r.bob_basis || '—'}
                          </span>
                        </td>
                        <td className={`py-2 px-3 font-bold ${isError ? 'text-red-400 underline decoration-red-400' : 'text-purple-300'}`}>
                          {r.bob_bit !== null ? r.bob_bit : 'Lost'}
                        </td>
                        <td className="py-2 px-3">
                          {r.match ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Match
                            </span>
                          ) : (
                            <span className="text-[var(--q-text-3)] flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> Mismatch
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {r.match ? (
                            <span className="px-1.5 py-0.5 rounded text-[11px] bg-emerald-500/20 text-emerald-300 font-semibold">
                              Retained
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[11px] bg-gray-500/10 text-[var(--q-text-3)]">
                              Discarded
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {r.isTest ? (
                            <span className="px-1.5 py-0.5 rounded text-[11px] bg-amber-500/20 text-amber-300 font-semibold">
                              Disclosed Test Bit
                            </span>
                          ) : r.retained ? (
                            <span className="px-1.5 py-0.5 rounded text-[11px] bg-emerald-500/20 text-emerald-300 font-semibold">
                              Candidate Secret Key
                            </span>
                          ) : (
                            <span className="text-[var(--q-text-3)]">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-[var(--q-text-3)] font-mono">
                <div>
                  Showing {tablePage * pageSize + 1} to {Math.min((tablePage + 1) * pageSize, filteredRows.length)} of {filteredRows.length} qubits
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={tablePage === 0}
                    onClick={() => setTablePage(p => Math.max(0, p - 1))}
                    className="p-1.5 rounded border border-[var(--q-border)] bg-[var(--q-surface-2)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--q-surface-active)]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span>Page {tablePage + 1} of {totalPages}</span>
                  <button
                    disabled={tablePage >= totalPages - 1}
                    onClick={() => setTablePage(p => Math.min(totalPages - 1, p + 1))}
                    className="p-1.5 rounded border border-[var(--q-border)] bg-[var(--q-surface-2)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--q-surface-active)]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: KEY AND SECURITY ANALYSIS
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-[var(--q-surface-1)] border border-[var(--q-border)] rounded-xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 text-[var(--q-text-1)]">
            <span className="w-6 h-6 rounded-full bg-[var(--q-surface-2)] text-amber-400 font-mono text-xs flex items-center justify-center font-bold border border-[var(--q-border)]">
              4
            </span>
            Section 4: Key and Security Analysis
          </h2>
          <p className="text-xs text-[var(--q-text-3)] mt-0.5">
            Statistical breakdown of sifting, public test bits, Quantum Bit Error Rate (QBER), and candidate key generation.
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 font-mono">
          {/* Transmitted Qubits */}
          <div className="bg-[var(--q-surface-2)] border border-[var(--q-border)] rounded-xl p-3">
            <div className="text-[11px] text-[var(--q-text-3)]">Transmitted Qubits</div>
            <div className="text-xl font-bold text-[var(--q-text-1)] mt-1">
              {results?.raw_key_length ?? '—'}
            </div>
            <div className="text-[10px] text-[var(--q-text-3)] mt-0.5">Total N</div>
          </div>

          {/* Matching Bases */}
          <div className="bg-[var(--q-surface-2)] border border-[var(--q-border)] rounded-xl p-3">
            <div className="text-[11px] text-[var(--q-text-3)]">Matching Bases</div>
            <div className="text-xl font-bold text-blue-400 mt-1">
              {results?.sifted_key_length ?? '—'}
            </div>
            <div className="text-[10px] text-[var(--q-text-3)] mt-0.5">
              {results ? `${((results.sifted_key_length / results.raw_key_length) * 100).toFixed(0)}% sifting` : '—'}
            </div>
          </div>

          {/* Sifted Key Length */}
          <div className="bg-[var(--q-surface-2)] border border-[var(--q-border)] rounded-xl p-3">
            <div className="text-[11px] text-[var(--q-text-3)]">Sifted Key</div>
            <div className="text-xl font-bold text-purple-400 mt-1">
              {results?.sifted_key_length ?? '—'}
            </div>
            <div className="text-[10px] text-[var(--q-text-3)] mt-0.5">Pre-sampling</div>
          </div>

          {/* Test Bits */}
          <div className="bg-[var(--q-surface-2)] border border-[var(--q-border)] rounded-xl p-3">
            <div className="text-[11px] text-[var(--q-text-3)]">Test Bits Sample</div>
            <div className="text-xl font-bold text-amber-400 mt-1">
              {results?.qber_sample_size ?? '—'}
            </div>
            <div className="text-[10px] text-[var(--q-text-3)] mt-0.5">Publicly revealed</div>
          </div>

          {/* Detected Errors */}
          <div className="bg-[var(--q-surface-2)] border border-[var(--q-border)] rounded-xl p-3">
            <div className="text-[11px] text-[var(--q-text-3)]">Detected Errors</div>
            <div className={`text-xl font-bold mt-1 ${results?.qber_sample_errors > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {results?.qber_sample_errors ?? '—'}
            </div>
            <div className="text-[10px] text-[var(--q-text-3)] mt-0.5">In test sample</div>
          </div>

          {/* Measured QBER */}
          <div className="bg-[var(--q-surface-2)] border border-[var(--q-border)] rounded-xl p-3">
            <div className="text-[11px] text-[var(--q-text-3)]">Measured QBER</div>
            <div className={`text-xl font-bold mt-1 ${isBreached ? 'text-red-400' : 'text-emerald-400'}`}>
              {qberPercent !== '—' ? `${qberPercent}%` : '—'}
            </div>
            <div className="text-[10px] text-[var(--q-text-3)] mt-0.5">Limit: 11.0%</div>
          </div>

          {/* Security Status */}
          <div className={`border rounded-xl p-3 col-span-2 sm:col-span-1 ${
            isKeyAccepted
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <div className="text-[11px] text-[var(--q-text-3)]">Status</div>
            <div className="text-sm font-bold mt-1 leading-tight">
              {results ? (isKeyAccepted ? 'ACCEPTED' : 'REJECTED') : 'READY'}
            </div>
            <div className="text-[10px] opacity-80 mt-0.5">
              {results ? (isKeyAccepted ? 'Secure channel' : 'Eavesdropping') : 'No run yet'}
            </div>
          </div>
        </div>

        {/* Small Sample Warning */}
        {isSmallSample && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Small Sample Notice:</strong> Tested bits ({results.qber_sample_size}) is small. In physical QKD, a small sample may not detect eavesdropping with high statistical confidence. A measured QBER of 0% on a tiny sample does not guarantee the absence of Eve.
            </span>
          </div>
        )}

        {/* Key Stages Display */}
        {results && (
          <div className="space-y-4 pt-2">
            {/* 1. Sifted Key Stream */}
            <div className="bg-[var(--q-surface-2)] border border-[var(--q-border)] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--q-text-2)]">
                  1. Sifted Key (Positions with Matching Bases)
                </span>
                <span className="text-xs font-mono text-purple-400">
                  Length: {results.sifted_key_length} bits
                </span>
              </div>
              <div className="p-3 bg-[var(--q-surface-0)] rounded-lg font-mono text-xs text-[var(--q-text-2)] break-all max-h-24 overflow-y-auto border border-[var(--q-border-subtle)]">
                {bitStream.filter(r => r.match).map((r, i) => (
                  <span key={i} className={r.isTest ? 'text-amber-400 font-bold underline' : 'text-emerald-400'}>
                    {r.bob_bit ?? '?'}
                  </span>
                ))}
              </div>
              <div className="text-[11px] text-[var(--q-text-3)] mt-1.5">
                Yellow underlined bits are sacrificed as public test bits; green bits form the candidate secret key.
              </div>
            </div>

            {/* 2. Disclosed Test Bits */}
            <div className="bg-[var(--q-surface-2)] border border-[var(--q-border)] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--q-text-2)]">
                  2. Publicly Disclosed Test Bits (Sacrificed for QBER Estimation)
                </span>
                <span className="text-xs font-mono text-amber-400">
                  {results.qber_sample_size} tested bits · {results.qber_sample_errors} errors
                </span>
              </div>
              <div className="p-3 bg-[var(--q-surface-0)] rounded-lg font-mono text-xs text-amber-300 break-all max-h-24 overflow-y-auto border border-[var(--q-border-subtle)]">
                {bitStream.filter(r => r.isTest).map((r, i) => (
                  <span key={i} className={`mr-1 px-1 rounded ${r.errorInBit ? 'bg-red-500/30 text-red-300 font-bold' : 'bg-amber-500/10'}`}>
                    {r.bob_bit}
                  </span>
                ))}
              </div>
              <div className="text-[11px] text-[var(--q-text-3)] mt-1.5">
                These bits were revealed over the public channel and therefore discarded from the final secret key to preserve confidentiality.
              </div>
            </div>

            {/* 3. Final Candidate Secret Key */}
            <div className={`border rounded-xl p-4 transition-colors ${
              isKeyAccepted ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-red-500/5 border-red-500/30'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--q-text-2)] flex items-center gap-1.5">
                  {isKeyAccepted ? <Lock className="w-3.5 h-3.5 text-emerald-400" /> : <Unlock className="w-3.5 h-3.5 text-red-400" />}
                  3. Final Candidate Secret Key
                </span>
                <span className={`text-xs font-mono font-bold ${isKeyAccepted ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isKeyAccepted ? `${results.post_sample_key_length} bits established` : '0 bits (Aborted)'}
                </span>
              </div>
              <div className="p-3 bg-[var(--q-surface-0)] rounded-lg font-mono text-xs break-all max-h-24 overflow-y-auto border border-[var(--q-border-subtle)]">
                {isKeyAccepted ? (
                  <span className="text-emerald-400 font-bold tracking-wider">
                    {candidateKeyBits.join('')}
                  </span>
                ) : (
                  <span className="text-red-400/80 italic">
                    Key exchange aborted: {results.key_exchange_abort_reason || 'QBER exceeded security threshold.'}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[var(--q-text-3)] mt-1.5">
                Note: In production QKD, error correction and privacy amplification are applied to distill an information-theoretically secure key. In this simulator, this key represents the post-sampling candidate key.
              </div>
            </div>
          </div>
        )}

        {/* Interactive One-Time Pad (OTP) Demonstration */}
        {results && isKeyAccepted && candidateKeyBits.length >= 8 && (
          <div className="mt-4 p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Interactive One-Time Pad (OTP) Encryption Demo
                </h3>
                <p className="text-xs text-[var(--q-text-3)] mt-0.5">
                  Demonstrates Vernam cipher XOR encryption using the generated candidate secret key.
                </p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                Max {Math.floor(candidateKeyBits.length / 8)} characters
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={otpMessage}
                maxLength={Math.floor(candidateKeyBits.length / 8)}
                onChange={(e) => setOtpMessage(e.target.value.toUpperCase())}
                placeholder="Enter text to encrypt (e.g. BB84)"
                className="flex-1 px-3 py-2 rounded-lg bg-[var(--q-surface-0)] border border-[var(--q-border)] font-mono text-sm uppercase text-[var(--q-text-1)] focus:outline-none focus:border-emerald-500"
              />
              <div className="flex items-center gap-1.5">
                {['BB84', 'KEY', 'QKD', 'SECURE'].map((word) => (
                  <button
                    key={word}
                    onClick={() => setOtpMessage(word.slice(0, Math.floor(candidateKeyBits.length / 8)))}
                    className="px-2.5 py-1.5 text-xs font-mono rounded border border-[var(--q-border)] bg-[var(--q-surface-2)] text-[var(--q-text-2)] hover:text-[var(--q-text-1)]"
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>

            {otpOutput && otpOutput.encRows.length > 0 && (
              <div className="p-3 bg-[var(--q-surface-0)] rounded-lg font-mono text-xs space-y-2 border border-[var(--q-border-subtle)]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <span className="text-[var(--q-text-3)] text-[10px] block">PLAINTEXT BITS:</span>
                    <span className="text-blue-300 font-bold">{otpOutput.encRows.map(r => r.msgBinary).join(' ')}</span>
                  </div>
                  <div>
                    <span className="text-[var(--q-text-3)] text-[10px] block">SECRET KEY BITS:</span>
                    <span className="text-amber-300 font-bold">{otpOutput.encRows.map(r => r.keySlice).join(' ')}</span>
                  </div>
                  <div>
                    <span className="text-[var(--q-text-3)] text-[10px] block">CIPHERTEXT (XOR):</span>
                    <span className="text-emerald-400 font-bold">{otpOutput.ciphertext}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-[var(--q-border-subtle)] flex items-center justify-between text-[11px]">
                  <span>Decrypted Plaintext: <strong>{otpOutput.decryptedText}</strong> (matches original message)</span>
                  <span className="text-emerald-400 font-semibold">✓ Exact Vernam Cipher Match</span>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 5: ONE QBER CHART
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-[var(--q-surface-1)] border border-[var(--q-border)] rounded-xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 text-[var(--q-text-1)]">
            <span className="w-6 h-6 rounded-full bg-[var(--q-surface-2)] text-amber-400 font-mono text-xs flex items-center justify-center font-bold border border-[var(--q-border)]">
              5
            </span>
            Section 5: Multi-Scenario QBER Comparison Chart
          </h2>
          <p className="text-xs text-[var(--q-text-3)] mt-0.5">
            Comparing Quantum Bit Error Rate across the 3 scenarios alongside the 11% Shor-Preskill security threshold.
          </p>
        </div>

        {/* Recharts Bar Chart Container */}
        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#282830" vertical={false} />
              <XAxis
                dataKey="scenario"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                interval={0}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 35]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="p-3 bg-[var(--q-surface-2)] border border-[var(--q-border)] rounded-lg shadow-lg font-mono text-xs space-y-1">
                        <div className="font-bold text-[var(--q-text-1)]">{data.scenario}</div>
                        <div className="text-[var(--q-text-3)]">{data.description}</div>
                        <div className="text-amber-400 font-bold pt-1">
                          QBER: {data.expectedQBER}%
                        </div>
                        <div className={data.expectedQBER >= 11 ? 'text-red-400' : 'text-emerald-400'}>
                          {data.expectedQBER >= 11 ? '❌ Exceeds 11% security limit' : '✓ Below 11% threshold'}
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              {/* 11% Security Threshold Reference Line */}
              <ReferenceLine
                y={11.0}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: 'Security Threshold (11%)',
                  position: 'top',
                  fill: '#f59e0b',
                  fontSize: 11,
                  fontFamily: 'monospace'
                }}
              />
              <Bar dataKey="expectedQBER" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fillColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Educational Physics Insight */}
        <div className="p-4 rounded-xl border border-[var(--q-border-subtle)] bg-[var(--q-surface-0)] text-xs text-[var(--q-text-2)] space-y-2">
          <div className="font-bold text-[var(--q-text-1)] flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-amber-400" />
            Theoretical Quantum Mechanics Principles Explained:
          </div>
          <ul className="list-disc pl-5 space-y-1 text-[var(--q-text-3)] leading-relaxed">
            <li>
              <strong>Ideal Channel (Scenario 1):</strong> In a noiseless quantum channel without Eve, Alice's prepared polarization matches Bob's basis measurement with 100% fidelity, resulting in <strong>0% QBER</strong>.
            </li>
            <li>
              <strong>Intercept-and-Resend Attack (Scenario 2):</strong> By the <em>No-Cloning Theorem</em>, Eve cannot copy unknown quantum states. When she measures in a random basis, she chooses the wrong basis with probability 1/2. When Bob subsequently measures in Alice's basis, he gets an error with probability 1/2. Overall expected error rate: $\frac{1}{2} \times \frac{1}{2} = 25\%$! This 25% error rate is not hardcoded; it emerges from quantum collapse.
            </li>
            <li>
              <strong>The 11.0% Threshold:</strong> Derived from the <em>Shor-Preskill / Csiszár-Körner bound</em> ($1 - 2H_2(QBER) &gt; 0$). When the error rate exceeds 11%, Eve possesses more mutual information with the sifted key than Bob does, making secure key distillation impossible.
            </li>
          </ul>
        </div>
      </section>

    </div>
  )
}
