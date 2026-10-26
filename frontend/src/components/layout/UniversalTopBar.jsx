/**
 * UniversalTopBar.jsx
 * 
 * Universal navigation bar for all pages.
 * Contains: QKD Simulator branding, hamburger menu (Home/Simulator/Guide), theme toggle
 */
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Atom, BookOpen, Menu } from 'lucide-react'
import useSimulationStore from '../../store/simulationStore'

export default function UniversalTopBar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef(null)
  const { activeView, setActiveView } = useSimulationStore()

  const menuItems = [
    { id: 'landing', label: 'Home', icon: Home },
    { id: 'simulator', label: 'Simulator', icon: Atom },
    { id: 'guide', label: 'Guide', icon: BookOpen },
  ]

  // Escape closes the navigation menu and returns focus to its trigger.
  // Without this the menu could only be dismissed with the mouse.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <div className="flex items-center justify-between px-3 py-1.5 h-12 flex-shrink-0 z-30 select-none"
         style={{
           backgroundColor: 'var(--q-surface-1)',
           borderBottom: '1px solid var(--q-border)'
         }}>
      
      {/* Left: Menu + Branding */}
      <div className="flex items-center gap-3">
        {/* Hamburger Menu */}
        <button
          ref={menuButtonRef}
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1.5 rounded transition-colors text-[var(--q-text-2)] hover:text-[var(--q-text-1)] hover:bg-[var(--q-surface-active)]"
          aria-label="Navigation Menu"
          aria-expanded={menuOpen}
          aria-controls="universal-nav-menu"
          title="Open navigation menu"
        >
          <Menu size={17} />
        </button>

        {/* QKD Simulator Branding (clickable to simulator) */}
        <button
          onClick={() => setActiveView('simulator')}
          className="flex items-center gap-2 hover:opacity-85 transition-opacity"
          title="BB84 QKD Simulator"
        >
          <span className="font-body text-sm tracking-wide font-bold text-[var(--q-text-1)]">
            QKDSimFlow
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-body font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: 'var(--q-surface-2)',
                  border: '1px solid var(--q-border)',
                  color: 'var(--q-accent)'
                }}>
            BB84
          </span>
        </button>
      </div>

      {/* Middle: Direct Navigation Tabs */}
      <div className="flex items-center gap-1 bg-[var(--q-surface-2)] p-1 rounded-lg border border-[var(--q-border)]">
        <button
          onClick={() => setActiveView('simulator')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors ${
            activeView !== 'guide'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-[var(--q-text-3)] hover:text-[var(--q-text-1)]'
          }`}
        >
          <Atom size={14} />
          <span>BB84 Simulator</span>
        </button>
        <button
          onClick={() => setActiveView('guide')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors ${
            activeView === 'guide'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-[var(--q-text-3)] hover:text-[var(--q-text-1)]'
          }`}
        >
          <BookOpen size={14} />
          <span>Guide &amp; Theory</span>
        </button>
      </div>

      {/* Right spacer to balance left branding */}
      <div className="flex items-center gap-2 w-28 justify-end" />

      {/* Dropdown Menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
            />
            
            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              id="universal-nav-menu"
              className="absolute top-12 left-4 z-50 rounded-lg shadow-2xl overflow-hidden"
              style={{
                backgroundColor: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                minWidth: '200px'
              }}
            >
              {menuItems.map((item) => {
                const IconComponent = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id)
                      setMenuOpen(false)
                    }}
                    aria-current={activeView === item.id ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-body font-medium transition-colors ${
                      activeView === item.id
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'text-[var(--text-primary)] hover:bg-white/5'
                    }`}
                  >
                    <IconComponent size={16} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
