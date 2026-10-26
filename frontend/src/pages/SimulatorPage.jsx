import { useEffect } from 'react'
import useSimulationStore from '../store/simulationStore'
import GuidePage from './GuidePage'
import UniversalTopBar from '../components/layout/UniversalTopBar'
import SimplifiedBB84Simulator from '../components/simplified/SimplifiedBB84Simulator'

const PAGE_TITLES = {
  simulator: 'BB84 Quantum Key Distribution Simulator',
  guide: 'Guide & Theory — BB84 QKD Simulator',
  landing: 'BB84 Quantum Key Distribution Simulator',
  results: 'BB84 Quantum Key Distribution Simulator',
}

export default function SimulatorPage() {
  const { activeView } = useSimulationStore()

  useEffect(() => {
    document.title = PAGE_TITLES[activeView] ?? PAGE_TITLES.simulator
  }, [activeView])

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--canvas-bg)' }}>
      <UniversalTopBar />
      <div className="flex-1 overflow-hidden relative">
        {activeView === 'guide' ? (
          <div className="h-full w-full overflow-hidden">
            <GuidePage />
          </div>
        ) : (
          <div className="h-full w-full overflow-y-auto">
            <SimplifiedBB84Simulator />
          </div>
        )}
      </div>
    </div>
  )
}
