'use client'

import { memo, useState, useEffect, useRef } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import { TrendingUp, TrendingDown, Trophy, Award } from 'lucide-react'
import { useThemeContext } from '@/contexts/theme-context'
import type { Agent } from '@/types'

// Detect if running on TV (no pointer device)
const isTV = typeof window !== 'undefined' && !window.matchMedia('(pointer: fine)').matches

interface AgentCardProps {
  agent: Agent
  index: number
  onClick: () => void
  rankChange?: 'up' | 'down' | 'same'
  scale?: number
  podiumCycleKey?: number
}

const getRankIcon = (rank: number, scale: number = 1, isDarkMode: boolean) => {
  const size = 40 * scale
  const fontSize = 36 * scale
  const textColor = isDarkMode ? 'text-white/70' : 'text-slate-600'
  switch (rank) {
    case 1:
      return <Trophy className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" style={{ width: `${size}px`, height: `${size}px` }} />
    case 2:
      return <Award className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" style={{ width: `${size}px`, height: `${size}px` }} />
    case 3:
      return <Award className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" style={{ width: `${size}px`, height: `${size}px` }} />
    default:
      return <span className={`font-bold ${textColor}`} style={{ fontSize: `${fontSize}px` }}>#{rank}</span>
  }
}

const getRankBackground = (rank: number, isDarkMode: boolean) => {
  switch (rank) {
    case 1:
      // Gold gradient background
      return 'bg-gradient-to-br from-[#FFD700] via-[#FFA500] to-[#FF8C00] border-[#FFD700]/80'
    case 2:
      // Silver gradient background
      return 'bg-gradient-to-br from-[#E8E8E8] via-[#C0C0C0] to-[#A8A8A8] border-[#C0C0C0]/80'
    case 3:
      // Matte bronze background (specified hex)
      return 'bg-[#C78D55] border-[#A97035]'
    default:
      return isDarkMode 
        ? 'bg-transparent border-white/20' 
        : 'bg-white/80 border-slate-300'
  }
}

const AgentCardComponent: React.FC<AgentCardProps> = ({ agent, index, onClick, rankChange, scale = 1, podiumCycleKey }) => {
  const { isDarkMode } = useThemeContext()
  const [imageError, setImageError] = useState(false)
  const hasMountedRef = useRef(false)
  const rank = agent.rank || index + 1
  const isTopThree = rank <= 3
  const isFourthOrBelow = rank >= 4
  
  // Reset image error when avatar URL changes
  useEffect(() => {
    setImageError(false)
  }, [agent.avatar, agent.profile_picture])
  
  // Calculate sizes based on scale with minimums for readability
  const avatarSize = Math.max(36, 85.6 * scale) // 7% larger than previous size
  const rankIconSize = Math.max(32, 80 * scale) // Minimum 32px for visibility
  const rankChangeIconSize = Math.max(20, 32 * scale) // Minimum 20px
  
  const textColor = isDarkMode ? 'text-white' : 'text-slate-900'
  const textColorMuted = isDarkMode ? 'text-white/70' : 'text-slate-600'
  const borderColor = isDarkMode ? 'border-white/20' : 'border-slate-300'

  useEffect(() => {
    hasMountedRef.current = true
    return () => {
      hasMountedRef.current = false
    }
  }, [])

  // Optimized animations for TV - simpler and faster
  const controls = useAnimationControls()

  useEffect(() => {
    if (!hasMountedRef.current || !isTopThree || isTV) {
      return
    }
    controls.set({ x: 0, y: 0, opacity: 1 })
  }, [controls, isTopThree])

  useEffect(() => {
    if (!hasMountedRef.current || !isTopThree || typeof podiumCycleKey === 'undefined' || isTV) {
      return
    }

    let isCancelled = false

    const runSequence = async () => {
      const exitDelay = (rank - 1) * 0.1

      await controls.start({
        x: '120%',
        opacity: 0,
        transition: {
          duration: 0.8,
          ease: 'easeInOut',
          delay: exitDelay,
        },
      })

      if (isCancelled || !hasMountedRef.current) {
        return
      }

      controls.set({ x: 0, y: '-60%', opacity: 0 })

      await controls.start({
        x: 0,
        y: 0,
        opacity: 1,
        transition: {
          type: 'spring',
          stiffness: 240,
          damping: 18,
          mass: 0.9,
          delay: (rank - 1) * 0.05,
        },
      })
    }

    runSequence()

    return () => {
      isCancelled = true
      controls.stop()
    }
  }, [controls, isTopThree, podiumCycleKey, rank])

  const animationProps = isTV
    ? {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        transition: { duration: 0.1 }
      }
    : {
        layout: true,
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
        transition: { duration: 0.3, ease: 'easeOut' },
        whileHover: { scale: 1.02, transition: { duration: 0.2 } }
      }

  const { animate: baseAnimate, ...restMotionProps } = animationProps as {
    animate?: any
  }

  const motionAnimate = isTopThree && !isTV ? controls : baseAnimate

  return (
    <motion.div
      {...restMotionProps}
      animate={motionAnimate}
      onClick={onClick}
      className="flex-shrink-0"
    >
      <div
        className={`relative overflow-hidden ${isTV ? '' : 'cursor-pointer'} ${isTV ? '' : 'transition-all duration-200'} ${getRankBackground(
          rank, isDarkMode
        )} ${isTV ? '' : (isDarkMode ? 'hover:border-white/30' : 'hover-border-slate-400')} ${rank <= 3 ? 'rounded-2xl' : 'rounded-none'} border`}
        style={{
          ...(rank >= 2 && rank <= 4 && { marginTop: `${15 * scale}px` }),
          ...(isFourthOrBelow && {
            borderLeftWidth: 0,
            borderRightWidth: 0,
          }),
          ...(rank === 1 && { paddingTop: `${10 * scale}px` }),
        }}
      >
        {/* Metal background for top 3 */}
        {isTopThree && rank <= 2 && (
          <>
            {/* Base metal gradient */}
            <div className="absolute inset-0 opacity-95" />
            
            {/* White shine/highlight effect for metallic look */}
            <div 
              className="absolute inset-0 opacity-60"
              style={{
                background: rank === 1 
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 30%, transparent 60%, rgba(255,255,255,0.2) 100%)'
                  : rank === 2
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 30%, transparent 60%, rgba(255,255,255,0.3) 100%)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 30%, transparent 60%, rgba(255,255,255,0.2) 100%)'
              }}
            />
            
            {/* Additional shine overlay for depth */}
            <div 
              className="absolute top-0 left-0 right-0 h-1/3 opacity-40"
              style={{
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.6), transparent)'
              }}
            />
          </>
        )}
        
        {/* Background pattern for non-top-3 */}
        {!isTopThree && (
          <div className={`absolute inset-0 ${isDarkMode ? 'bg-[radial-gradient(circle_at_top_right,rgba(71,85,105,0.1),transparent_50%)]' : 'bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.1),transparent_50%)]'}`} />
        )}
        
        {/* Rank change indicator */}
        {rankChange && rankChange !== 'same' && (
          <motion.div
            className={`absolute z-20 ${
              rankChange === 'up' ? (isTopThree ? 'text-green-600' : 'text-green-400') : (isTopThree ? 'text-red-600' : 'text-red-400')
            }`}
            style={{ top: `${16 * scale}px`, right: `${16 * scale}px` }}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            {rankChange === 'up' ? (
              <TrendingUp style={{ width: `${rankChangeIconSize}px`, height: `${rankChangeIconSize}px` }} />
            ) : (
              <TrendingDown style={{ width: `${rankChangeIconSize}px`, height: `${rankChangeIconSize}px` }} />
            )}
          </motion.div>
        )}

        <div className="relative z-20" style={{ padding: `${18 * scale}px` }}>
          <div className="flex items-center" style={{ gap: `${20 * scale}px` }}>
            {/* Rank Badge */}
            <div className="flex-shrink-0 flex items-center justify-center" style={{ width: `${rankIconSize}px`, height: `${rankIconSize}px` }}>
              {getRankIcon(rank, scale, isDarkMode)}
            </div>

            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div
                  className={`rounded-full overflow-hidden ${
                    isTopThree ? 'border-white shadow-lg shadow-white/50' : 'border-white/20'
                  }`}
                  style={{ 
                    width: `${avatarSize}px`, 
                    height: `${avatarSize}px`,
                    borderWidth: `${3 * scale}px`,
                    minWidth: `${36}px`, // Minimum avatar size for visibility
                    minHeight: `${36}px`
                  }}
                >
                  {(agent.avatar || agent.profile_picture) && !imageError ? (
                    <img
                      src={agent.avatar || agent.profile_picture}
                      alt={agent.name}
                      className="w-full h-full object-cover"
                      onError={() => setImageError(true)}
                      loading="lazy"
                    />
                  ) : (
                    <div 
                      className="w-full h-full bg-[#203A53] flex items-center justify-center text-white font-bold"
                      style={{ fontSize: `${Math.max(18, 24 * scale)}px` }}
                    >
                      {agent.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Agent Info */}
            <div className="flex-1 min-w-0" style={{ marginLeft: '75px' }}>
              <h3 
                className={`font-bold truncate ${
                  isTopThree 
                    ? 'text-slate-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]' 
                    : textColor
                }`}
                style={{ fontSize: `${Math.max(23.625, 40.5 * scale)}px`, lineHeight: '1.05' }}
              >
                {agent.name}
              </h3>
            </div>

            {/* Stats */}
            <div className="flex-shrink-0 text-right flex items-baseline" style={{ paddingRight: '100px' }}>
              <div 
                className={`font-bold ${
                  isTopThree 
                    ? 'text-slate-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]' 
                    : textColor
                }`}
                style={{ fontSize: `${Math.max(35.5904, 53.2816 * scale)}px` }}
              >
                €{(agent.total_commission || agent.xp || 0).toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* Badges */}
          {agent.badges && agent.badges.length > 0 && (
            <div className="mt-3 flex gap-1 flex-wrap">
              {agent.badges.slice(0, 3).map((badge, i) => (
                <span
                  key={i}
                  className={`text-xs px-2 py-1 rounded-full ${
                    rank === 1 ? 'bg-[#FFD700]/30 text-slate-900' :
                    rank === 2 ? 'bg-[#C0C0C0]/30 text-slate-900' :
                    rank === 3 ? 'bg-[#CD7F32]/30 text-slate-900' :
                    'bg-[#FFD700]/20 text-[#FFD700]'
                  }`}
                >
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Memoize component to prevent unnecessary re-renders
export const AgentCard = memo(AgentCardComponent, (prevProps, nextProps) => {
  // Only re-render if agent data actually changed
  // Return true if props are equal (skip re-render), false if different (re-render)
  return (
    prevProps.agent.id === nextProps.agent.id &&
    prevProps.agent.rank === nextProps.agent.rank &&
    prevProps.agent.total_commission === nextProps.agent.total_commission &&
    prevProps.agent.closed_transactions === nextProps.agent.closed_transactions &&
    prevProps.agent.avatar === nextProps.agent.avatar &&
    prevProps.agent.profile_picture === nextProps.agent.profile_picture &&
    prevProps.agent.name === nextProps.agent.name &&
    prevProps.rankChange === nextProps.rankChange &&
    prevProps.scale === nextProps.scale
  )
})

