'use client'

export const runtime = 'edge'

import { GamifiedLeaderboard } from '@/components/modules/leaderboard/gamified-leaderboard'
import { StatsOverview } from '@/components/modules/stats/stats-overview'
import { useAgentLeaderboard } from '@/hooks/use-agent-leaderboard'
import { ThemeProvider, useThemeContext } from '@/contexts/theme-context'

const POLLING_INTERVAL = 5000

function TVDisplayContent({ stats, agents }: { stats: any, agents: any }) {
  const { isDarkMode } = useThemeContext()

  return (
    <main className={`h-screen w-screen overflow-hidden transition-colors duration-500 ${
      isDarkMode ? 'bg-[#0F172A]' : 'bg-[#F8FAFC]'
    }`}>
      <div 
        className="w-full flex gap-8" 
        style={{ 
          marginTop: '3%', 
          marginBottom: '-20%', 
          height: '115%',
          paddingLeft: '4%',
          paddingRight: '4%',
          paddingBottom: '-20%'
        }}
      >
        {/* Column 1: Stats (2 rows) */}
        <div className="w-[30%] h-full flex flex-col">
          <StatsOverview stats={stats} agents={agents} />
        </div>

        {/* Column 2: Leaderboard */}
        <div className="w-[70%] h-full flex flex-col">
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

