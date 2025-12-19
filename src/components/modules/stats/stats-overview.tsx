'use client'

import { motion } from 'framer-motion'
import { TrendingUp, DollarSign } from 'lucide-react'
import type { AgentStats, Agent } from '@/types'
import { Clock } from './clock'
import { MonthlyGoalProgress } from './monthly-goal-progress'
import { useThemeContext } from '@/contexts/theme-context'

interface StatsOverviewProps {
  stats: AgentStats | null
  agents: Agent[]
}

const formatCommission = (amount: number): string => {
  if (amount >= 1000000) {
    return `€${(amount / 1000000).toFixed(0)}M`
  } else if (amount >= 1000) {
    return `€${(amount / 1000).toFixed(0)}k`
  }
  return `€${amount.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}`
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats, agents }) => {
  const { isDarkMode } = useThemeContext()
  
  const textColor = isDarkMode ? 'text-white' : 'text-slate-900'
  const textColorMuted = isDarkMode ? 'text-white/70' : 'text-slate-600'
  const borderColor = isDarkMode ? 'border-white/20' : 'border-slate-300'
  const iconColor = isDarkMode ? 'text-white/50' : 'text-slate-400'
  
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Row 1: Clock */}
      <div className="flex-shrink-0" style={{ height: '34%', paddingTop: '85px' }}>
        <Clock />
      </div>

      {/* Row 2: Total Transactions and Total Commission */}
      <div className="flex-shrink-0 flex gap-6" style={{ height: '20%', marginTop: '60px' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`flex-1 relative overflow-hidden rounded-2xl bg-transparent border ${borderColor} p-4 transition-all duration-300 ${isDarkMode ? 'hover:border-white/30' : 'hover:border-slate-400'}`}
        >
          <div className="flex flex-col h-full justify-start">
            <div className="flex items-center justify-between mb-1">
              <TrendingUp className={`h-8 w-8 ${iconColor}`} />
            </div>
            <div className="flex-1 flex flex-col justify-center items-center min-h-0">
              <p className={`text-base ${textColorMuted} mb-1`}>Total Tranzacții</p>
              <p className={`font-bold ${textColor} break-words overflow-hidden text-center`} style={{ fontSize: '6rem', lineHeight: '1' }}>
                {stats?.total_transactions || 0}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`flex-1 relative overflow-hidden rounded-2xl bg-transparent border ${borderColor} p-4 transition-all duration-300 ${isDarkMode ? 'hover:border-white/30' : 'hover:border-slate-400'}`}
        >
          <div className="flex flex-col h-full justify-start">
            <div className="flex items-center justify-between mb-1">
              <DollarSign className={`h-8 w-8 ${iconColor}`} />
            </div>
            <div className="flex-1 flex flex-col justify-center items-center min-h-0">
              <p className={`text-base ${textColorMuted} mb-1`}>Total Comision</p>
              <p className={`font-bold ${textColor} break-words overflow-hidden text-center`} style={{ fontSize: '4.25rem', lineHeight: '1' }}>
                {formatCommission(stats?.total_commission || 0)}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Row 3: Monthly Goal Progress */}
      <div className="flex-shrink-0" style={{ height: '46%', marginTop: '80px', paddingTop: '60px'}}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="h-full"
        >
          <MonthlyGoalProgress agents={agents} />
        </motion.div>
      </div>
    </div>
  )
}

