'use client'

import { GamifiedLeaderboard } from '@/components/modules/leaderboard/gamified-leaderboard'
import { StatsOverview } from '@/components/modules/stats/stats-overview'
import { useAgentLeaderboard } from '@/hooks/use-agent-leaderboard'
import { ThemeProvider, useThemeContext } from '@/contexts/theme-context'

const POLLING_INTERVAL = 5000

function TVDisplayContent({ stats, agents }: { stats: any, agents: any }) {
  const { isDarkMode } = useThemeContext()

  return (
    <main className={`h-screen w-screen overflow-hidden transition-colors duration-500 ${
      isDarkMode ? 'bg-[#1F2933]' : 'bg-[#F8FAFC]'
    }`}>
      <div 
        className="w-full flex" 
        style={{ 
          marginTop: '3%', 
          marginBottom: '-20%', 
          height: '115%',
          paddingLeft: '4%',
          paddingRight: '4%',
          paddingBottom: '-20%',
          gap: '50px',
        }}
      >
        {/* Column 1: Stats (2 rows) */}
        <div className="w-[30%] h-full flex flex-col">
          <StatsOverview stats={stats} agents={agents} />
        </div>

        {/* Column 2: Leaderboard */}
        <div className="w-[70%] h-full flex flex-col" style={{ paddingLeft: '50px', paddingTop: '10px' }}>
          <GamifiedLeaderboard />
        </div>
      </div>
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

