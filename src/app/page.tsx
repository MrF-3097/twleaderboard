'use client'

import { useEffect, useState } from 'react'
import { GamifiedLeaderboard } from '@/components/modules/leaderboard/gamified-leaderboard'
import { StatsOverview } from '@/components/modules/stats/stats-overview'
import { HistoricLeaderboardModal } from '@/components/modules/leaderboard/historic-leaderboard-modal'
import { useAgentLeaderboard } from '@/hooks/use-agent-leaderboard'
import { useHistoricalLeaderboard } from '@/hooks/use-historical-leaderboard'
import { ThemeProvider, useThemeContext } from '@/contexts/theme-context'
import { unlockAudio } from '@/lib/sounds'

const POLLING_INTERVAL = 5000

function TVDisplayContent({ stats, agents }: { stats: any, agents: any }) {
  const { isDarkMode } = useThemeContext()
  const [isHistoricModalOpen, setIsHistoricModalOpen] = useState(false)

  // Auto-save monthly snapshots
  useHistoricalLeaderboard(agents, stats, { autoSave: true })

  // Unlock audio on page load and first user interaction
  useEffect(() => {
    // Try to unlock immediately
    unlockAudio()

    // Also unlock on first user interaction (click, touch, keydown)
    const unlockOnInteraction = () => {
      unlockAudio()
      document.removeEventListener('click', unlockOnInteraction)
      document.removeEventListener('touchstart', unlockOnInteraction)
      document.removeEventListener('keydown', unlockOnInteraction)
    }

    document.addEventListener('click', unlockOnInteraction, { once: true })
    document.addEventListener('touchstart', unlockOnInteraction, { once: true })
    document.addEventListener('keydown', unlockOnInteraction, { once: true })

    return () => {
      document.removeEventListener('click', unlockOnInteraction)
      document.removeEventListener('touchstart', unlockOnInteraction)
      document.removeEventListener('keydown', unlockOnInteraction)
    }
  }, [])

  return (
    <main className={`min-h-screen w-screen transition-colors duration-500 ${
      isDarkMode ? 'bg-[#1F2933]' : 'bg-[#F8FAFC]'
    }`}>
      <div 
        className="w-full flex" 
        style={{ 
          marginTop: '3%', 
          marginBottom: '-20%', 
          minHeight: '115%',
          paddingLeft: '4%',
          paddingRight: '4%',
          paddingBottom: '-20%',
          gap: '50px',
        }}
      >
        {/* Column 1: Stats (2 rows) */}
        <div className="w-[30%] flex flex-col">
          <StatsOverview
            stats={stats}
            agents={agents}
            onOpenHistoric={() => setIsHistoricModalOpen(true)}
          />
        </div>

        {/* Column 2: Leaderboard */}
        <div className="w-[70%] flex flex-col" style={{ paddingLeft: '50px', height: '100vh', maxHeight: '100vh' }}>
        <GamifiedLeaderboard />
        </div>
      </div>

      {/* Historic Leaderboard Modal */}
      <HistoricLeaderboardModal
        isOpen={isHistoricModalOpen}
        onClose={() => setIsHistoricModalOpen(false)}
        currentAgents={agents}
        currentStats={stats}
      />
    </main>
  )
}

export default function TVDisplayPage() {
  const { stats, agents } = useAgentLeaderboard(POLLING_INTERVAL)

  return (
    <ThemeProvider>
      <TVDisplayContent stats={stats} agents={agents} />
    </ThemeProvider>
  )
}

