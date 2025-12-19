'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Trophy, RefreshCcw } from 'lucide-react'
import { useAgentLeaderboard } from '@/hooks/use-agent-leaderboard'
import { AgentCard } from './agent-card'
import { AgentDetailModal } from './agent-detail-modal'
import { CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { playSound } from '@/lib/sounds'
import { useThemeContext } from '@/contexts/theme-context'
import type { Agent } from '@/types'

const POLLING_INTERVAL = 5000 // 5 seconds - matches external API cache duration
const MAX_AGENTS = 20
const DEFAULT_SCREEN_HEIGHT = 1080 // Fallback if window is not available
const MARGIN_TOP_PERCENT = 3 // 3% margin top
const MARGIN_BOTTOM_PERCENT = 0 // No bottom margin (using negative margin from page)
const HEADER_HEIGHT = 120 // Header + title + padding (description removed)
const CARD_GAP = 3 // Gap between cards (smaller for more agents)
const SIZE_MULTIPLIER = 0.99 // 10% size reduction (from 1.1 to 0.99)

/**
 * Calculate dynamic scaling factor based on number of agents
 * Ensures all agents fit on screen using actual viewport height
 * 
 * Base card structure (at scale 1.0):
 * - Padding: 18px top + 18px bottom = 36px
 * - Content row (avatar, name, stats): ~90px
 * - Total: ~126px per card at scale 1.0 (optimized for readability)
 */
const calculateScaling = (agentCount: number, actualScreenHeight: number = DEFAULT_SCREEN_HEIGHT): number => {
  if (agentCount === 0) return 1
  
  // Calculate available height with 3% margins top and bottom
  const marginTop = actualScreenHeight * (MARGIN_TOP_PERCENT / 100)
  const marginBottom = actualScreenHeight * (MARGIN_BOTTOM_PERCENT / 100)
  const availableHeight = actualScreenHeight - marginTop - marginBottom - HEADER_HEIGHT
  
  // Total gaps between cards
  const totalGaps = Math.max(0, (agentCount - 1) * CARD_GAP)
  
  // Available height for actual card content
  const availableForCards = availableHeight - totalGaps
  
  // Base card height at scale 1.0
  // Optimized: padding (36px) + content row (90px) = 126px
  const baseCardHeight = 126
  
  // Calculate maximum card height that fits
  const maxCardHeight = availableForCards / agentCount
  
  // Calculate scale factor (how much to scale down from base)
  // This ensures all cards fit on screen
  let scale = maxCardHeight / baseCardHeight
  
  // Minimum scale for readability (0.5 = 50% of original size)
  // Increased to ensure names and images remain clearly visible
  // At 0.5 scale: names ~12px, avatars ~40px - readable on TV
  const minReadableScale = 0.5
  
  // If calculated scale is below minimum readable scale, we have a problem
  // In this case, we need to reduce spacing/padding to fit
  if (scale < minReadableScale) {
    // Try reducing base card height by reducing padding
    const reducedBaseHeight = 110 // Less padding
    const reducedScale = maxCardHeight / reducedBaseHeight
    
    // Use the better of the two, but never below readability minimum
    scale = Math.max(minReadableScale, reducedScale)
  } else {
    // Use calculated scale, but ensure it's at least the minimum
    scale = Math.max(minReadableScale, scale)
  }
  
  // Clamp to maximum of 1.1 (allow 10% larger than base)
  scale = Math.min(1.1, scale)
  
  // Apply size multiplier for overall increase
  return scale * SIZE_MULTIPLIER
}

const TOP_PAUSE_DURATION = 120000 // 2 minutes at top
const BOTTOM_PAUSE_DURATION = 5000 // 5 seconds at bottom
const SCROLL_SPEED = 30 // pixels per second
const AGENTS_VISIBLE = 10 // Number of agents visible at once
const PODIUM_LOOP_INTERVAL = 60000

export const GamifiedLeaderboard: React.FC = () => {
  const { isDarkMode } = useThemeContext()
  const { agents, isLoading, error, rankChanges, refetch } = useAgentLeaderboard(POLLING_INTERVAL)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const previousRankChangesRef = useRef<typeof rankChanges>([])
  const [viewportHeight, setViewportHeight] = useState(DEFAULT_SCREEN_HEIGHT)
  
  // Get actual viewport height (throttled for performance)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null
    
    const updateViewportHeight = () => {
      if (typeof window !== 'undefined') {
        setViewportHeight(window.innerHeight)
      }
    }
    
    const throttledUpdate = () => {
      if (timeoutId) return
      timeoutId = setTimeout(() => {
        updateViewportHeight()
        timeoutId = null
      }, 250) // Throttle to 250ms
    }
    
    updateViewportHeight() // Initial update
    window.addEventListener('resize', throttledUpdate)
    
    return () => {
      window.removeEventListener('resize', throttledUpdate)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])
  
  // Calculate dynamic scaling based on visible agents (always 10) and actual viewport height
  const scale = useMemo(() => calculateScaling(AGENTS_VISIBLE, viewportHeight), [viewportHeight])
  
  const [podiumCycleKey, setPodiumCycleKey] = useState(0)

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null

    const triggerCycle = () => {
      setPodiumCycleKey((prev) => prev + 1)
    }

    triggerCycle()
    intervalId = setInterval(triggerCycle, PODIUM_LOOP_INTERVAL)

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [])

  const textColor = isDarkMode ? 'text-white' : 'text-slate-900'
  const textColorMuted = isDarkMode ? 'text-white/70' : 'text-slate-600'
  const borderColor = isDarkMode ? 'border-white/20' : 'border-slate-300'
  const bgColor = isDarkMode ? 'bg-transparent' : 'bg-white/50'
  

  // Play sounds when rank changes occur
  useEffect(() => {
    // Only play sounds if there are new rank changes
    if (rankChanges.length === 0) {
      previousRankChangesRef.current = []
      return
    }

    // Compare with previous changes to find new ones
    const previousChangeMap = new Map(
      previousRankChangesRef.current.map(c => [`${c.agentId}-${c.oldRank}-${c.newRank}`, c])
    )
    
    const newChanges = rankChanges.filter(change => {
      const key = `${change.agentId}-${change.oldRank}-${change.newRank}`
      return !previousChangeMap.has(key)
    })

    // Log rank changes for debugging
    if (newChanges.length > 0) {
      console.log('[Leaderboard] Rank changes detected:', newChanges)
    }

    // Play sounds for each new rank change
    newChanges.forEach((change) => {
      if (change.type === 'up') {
        // Small delay to ensure sounds don't overlap too much
        setTimeout(() => {
          console.log('[Leaderboard] Playing rank_up sound')
          playSound('rank_up')
        }, 0)
      } else if (change.type === 'down') {
        setTimeout(() => {
          console.log('[Leaderboard] Playing rank_down sound')
          playSound('rank_down')
        }, 50)
      }
    })
    
    // Update previous changes
    previousRankChangesRef.current = rankChanges
  }, [rankChanges])

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent)
    setIsModalOpen(true)
  }

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
    // Clear selected agent after animation completes
    setTimeout(() => {
      setSelectedAgent(null)
    }, 300)
  }, [])

  const handleRefresh = () => {
    refetch()
  }

  if (error && agents.length === 0) {
    return (
      <div className={`relative overflow-hidden rounded-2xl ${isDarkMode ? 'bg-transparent' : 'bg-white/50'} border border-red-500/50`}>
        <div className="relative z-10 p-6">
          <div className="text-center py-8">
            <p className="text-red-400 font-medium text-lg">Eroare la încărcarea clasamentului</p>
            <p className={`text-sm ${textColorMuted} mt-2 max-w-md mx-auto`}>{error}</p>
            <div className="mt-4 space-y-2">
              <Button onClick={handleRefresh} className={`bg-transparent ${isDarkMode ? 'hover:bg-white/10 text-white border-white/20' : 'hover:bg-slate-100 text-slate-900 border-slate-300'}`}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Încearcă din nou
              </Button>
              <p className={`text-xs ${textColorMuted} mt-4`}>
                  Dacă problema persistă, verificați că serverul API rulează și este accesibil.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Leaderboard Title */}
      <div className="text-center">
        <h2 className={`text-5xl font-bold ${textColor} tracking-wide`}>
          Clasament Lunar
        </h2>
      </div>
      
      {/* Leaderboard */}
      <div className={`relative overflow-hidden rounded-2xl ${bgColor} flex-1 flex flex-col min-h-0`}>
        <div className="relative z-10 flex flex-col min-h-0">
          <CardContent className="flex-1 min-h-0">
            {isLoading && agents.length === 0 ? (
              <div className="text-center py-16">
                <RefreshCcw className={`h-16 w-16 mx-auto mb-6 animate-spin ${isDarkMode ? 'text-white/50' : 'text-slate-400'}`} />
                <p className={`text-xl ${textColorMuted}`}>Se încarcă clasamentul...</p>
              </div>
            ) : agents.length === 0 ? (
              <div className={`text-center py-16 ${textColorMuted}`}>
                <Trophy className="h-16 w-16 mx-auto mb-6 opacity-50" />
                <p className="text-xl">Nu s-au găsit agenți</p>
              </div>
            ) : (
              <div 
                style={{ gap: '4px', paddingTop: `${15 * scale}px`, paddingBottom: `${15 * scale}px` }} 
                className="flex flex-col"
              >
                {/* Prerender all agents in DOM for smooth reordering when ranks change */}
                {/* React will just reorder existing elements instead of creating new ones */}
                      {agents.map((agent, index) => {
                  const rankChange = rankChanges.find((rc) => rc.agentId === agent.id)
                  const isVisible = index < 11 // Show first 11 agents, 11th is partially visible and cut off at bottom
                         const agentRank = agent.rank ?? index + 1
                  
                  return (
                    <div
                      key={agent.id}
                      className={isVisible ? '' : 'hidden'}
                      style={{
                        // Keep all agents in DOM flow for React reconciliation
                        // Hidden agents are still in DOM but not rendered visually
                        flexShrink: 0,
                      }}
                    >
                      <AgentCard
                        agent={agent}
                        index={index}
                        onClick={() => handleAgentClick(agent)}
                        rankChange={rankChange?.type}
                              scale={scale}
                              podiumCycleKey={agentRank <= 3 ? podiumCycleKey : undefined}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </div>
      </div>

      {/* Agent Detail Modal */}
      <AgentDetailModal
        agent={selectedAgent}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  )
}

