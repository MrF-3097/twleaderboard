'use client'

import { motion } from 'framer-motion'
import { Target } from 'lucide-react'
import type { Agent } from '@/types'
import { useThemeContext } from '@/contexts/theme-context'

interface MonthlyGoalProgressProps {
  agents: Agent[]
}

const MONTHLY_GOAL = 20000 // 20,000 EUR

export const MonthlyGoalProgress: React.FC<MonthlyGoalProgressProps> = ({ agents }) => {
  const { isDarkMode } = useThemeContext()
  
  // Calculate total commission from all agents
  const totalCommission = agents.reduce(
    (sum, agent) => sum + (agent.total_commission || 0),
    0
  )

  // Calculate progress percentage (can exceed 100%)
  const progressPercentage = (totalCommission / MONTHLY_GOAL) * 100
  const remaining = Math.max(MONTHLY_GOAL - totalCommission, 0)
  
  const textColor = isDarkMode ? 'text-white' : 'text-slate-900'
  const textColorMuted = isDarkMode ? 'text-white/70' : 'text-slate-600'
  const borderColor = isDarkMode ? 'border-white/20' : 'border-slate-300'
  const iconColor = isDarkMode ? 'text-white/50' : 'text-slate-400'
  const trackBg = isDarkMode ? 'bg-white/10' : 'bg-slate-200'

  return (
    <div className={`flex-1 relative overflow-hidden rounded-2xl bg-transparent border ${borderColor} p-4 transition-all duration-300 ${isDarkMode ? 'hover:border-white/30' : 'hover:border-slate-400'}`}>
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <Target className={`h-6 w-6 ${iconColor}`} />
          <p className={`text-sm ${textColorMuted}`}>Progres Obiectiv Lunar</p>
        </div>
        
        <div className="flex-1 flex flex-col justify-center min-h-0 gap-3">
          {/* Progress Bar Container */}
          <div className="relative w-full">
            {/* Background track */}
            <div className={`h-12 ${trackBg} rounded-full overflow-hidden relative`}>
              {/* Animated gradient progress bar */}
              <motion.div
                className="h-full rounded-full relative overflow-hidden"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              >
                {/* Gold gradient with flowing animation */}
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700]"
                  style={{
                    backgroundSize: '200% 100%',
                  }}
                  animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                
                {/* Shine effect overlay */}
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </motion.div>
              
              {/* Progress percentage text overlay */}
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <motion.span
                  className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'} drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {progressPercentage.toFixed(1)}%
                </motion.span>
              </div>
              
              {/* Overcompletion indicator - show when over 100% */}
              {progressPercentage > 100 && (
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-[#FFD700] opacity-50" />
              )}
            </div>
          </div>

          {/* Stats below progress bar */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex flex-col">
              <p className={textColorMuted}>Curent</p>
              <motion.p
                className={`text-xl font-bold ${textColor}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                €{totalCommission.toLocaleString('ro-RO')}
              </motion.p>
            </div>
            
            <div className="flex flex-col items-center">
              <p className={textColorMuted}>Obiectiv</p>
              <p className="text-xl font-bold text-[#FFD700]">
                €{MONTHLY_GOAL.toLocaleString('ro-RO')}
              </p>
            </div>
            
            <div className="flex flex-col items-end">
              <p className={textColorMuted}>{progressPercentage >= 100 ? 'Depășire' : 'Rămas'}</p>
              <motion.p
                className={`text-xl font-bold ${textColor}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {progressPercentage >= 100 
                  ? `+€${(totalCommission - MONTHLY_GOAL).toLocaleString('ro-RO')}`
                  : `€${remaining.toLocaleString('ro-RO')}`
                }
              </motion.p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

