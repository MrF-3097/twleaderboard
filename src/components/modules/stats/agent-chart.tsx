'use client'

import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import type { Agent } from '@/types'

interface AgentChartProps {
  agents: Agent[]
}

export const AgentChart: React.FC<AgentChartProps> = ({ agents }) => {
  if (!agents || agents.length === 0) {
    return (
      <div className="flex-1 relative overflow-hidden rounded-2xl bg-transparent border border-white/20 p-4 transition-all duration-300 hover:border-white/30">
        <div className="flex flex-col h-full justify-center items-center">
          <p className="text-white/50 text-lg">No agents data available</p>
        </div>
      </div>
    )
  }

  // Sort agents by commission (descending) and take top agents for wave chart
  const sortedAgents = [...agents]
    .sort((a, b) => (b.total_commission || 0) - (a.total_commission || 0))
    .slice(0, 20) // Use more points for smoother wave

  const maxCommission = Math.max(...sortedAgents.map(agent => agent.total_commission || 0), 1)
  const minCommission = Math.min(...sortedAgents.map(agent => agent.total_commission || 0), 0)
  const range = maxCommission - minCommission || 1

  // Create points for the wave (normalized to 0-100%)
  const points = sortedAgents.map((agent, index) => {
    const commission = agent.total_commission || 0
    const normalized = ((commission - minCommission) / range) * 100
    const x = (index / (sortedAgents.length - 1)) * 100
    return { x, y: normalized, commission, agent }
  })

  // Create SVG path for the wave using smooth curves
  const createWavePath = (points: typeof points, height: number) => {
    if (points.length === 0) return ''
    
    let path = `M 0 ${height} `
    
    // Use quadratic curves for smooth wave
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i]
      const next = points[i + 1]
      const midX = (current.x + next.x) / 2
      const midY = (current.y + next.y) / 2
      
      if (i === 0) {
        path += `L ${current.x} ${height - (current.y / 100) * height} `
      }
      
      path += `Q ${current.x} ${height - (current.y / 100) * height}, ${midX} ${height - (midY / 100) * height} `
    }
    
    const last = points[points.length - 1]
    path += `L ${last.x} ${height - (last.y / 100) * height} `
    path += `L 100 100 L 0 100 Z`
    
    return path
  }

  const svgHeight = 100
  const wavePath = createWavePath(points, svgHeight)

  return (
    <div className="flex-1 relative overflow-hidden rounded-2xl bg-transparent border border-white/20 p-4 transition-all duration-300 hover:border-white/30">
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <TrendingUp className="h-6 w-6 text-white/50" />
          <p className="text-sm text-white/70">Agent Performance Wave</p>
        </div>
        <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden relative" style={{ maxHeight: '100%' }}>
          <div className="w-full h-full relative" style={{ minHeight: 0 }}>
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="w-full h-full"
              style={{ display: 'block', maxHeight: '100%' }}
            >
              <defs>
                <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#EC4899" stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="waveGradientTop" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FFD700" stopOpacity="0.9" />
                  <stop offset="33%" stopColor="#C0C0C0" stopOpacity="0.7" />
                  <stop offset="66%" stopColor="#CD7F32" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.5" />
                </linearGradient>
              </defs>
              
              {/* Wave fill */}
              <motion.path
                d={wavePath}
                fill="url(#waveGradient)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
              
              {/* Wave stroke */}
              <motion.path
                d={wavePath}
                fill="none"
                stroke="url(#waveGradientTop)"
                strokeWidth="0.5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 2, delay: 0.3, ease: "easeInOut" }}
              />
            </svg>
            
            {/* Animated dots for top agents */}
            {points.slice(0, 5).map((point, index) => (
              <motion.div
                key={index}
                className="absolute w-1.5 h-1.5 rounded-full bg-[#FFD700] shadow-lg"
                style={{
                  left: `${point.x}%`,
                  bottom: `${point.y}%`,
                  transform: 'translate(-50%, 50%)',
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  duration: 0.5, 
                  delay: 2 + index * 0.1,
                  repeat: Infinity,
                  repeatType: "reverse",
                  repeatDelay: 2
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
