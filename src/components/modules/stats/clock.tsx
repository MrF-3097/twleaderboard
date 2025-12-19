'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock as ClockIcon } from 'lucide-react'
import { useThemeContext } from '@/contexts/theme-context'

export const Clock: React.FC = () => {
  const { isDarkMode } = useThemeContext()
  const [time, setTime] = useState<Date>(new Date())
  const [mounted, setMounted] = useState(false)
  
  const textColor = isDarkMode ? 'text-white' : 'text-slate-900'
  const textColorMuted = isDarkMode ? 'text-white/70' : 'text-slate-600'
  const borderColor = isDarkMode ? 'border-white/20' : 'border-slate-300'
  const iconColor = isDarkMode ? 'text-white/50' : 'text-slate-400'

  useEffect(() => {
    setMounted(true)
    // Update every second, but use requestAnimationFrame for smoother updates on TV
    let rafId: number | null = null
    let lastUpdate = Date.now()
    
    const updateTime = () => {
      const now = Date.now()
      if (now - lastUpdate >= 1000) {
        setTime(new Date())
        lastUpdate = now
      }
      rafId = requestAnimationFrame(updateTime)
    }
    
    rafId = requestAnimationFrame(updateTime)
    
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [])

  // Format time for Romanian timezone (Europe/Bucharest)
  const formatRomanianTime = (date: Date) => {
    return new Intl.DateTimeFormat('ro-RO', {
      timeZone: 'Europe/Bucharest',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
  }

  const formatRomanianDate = (date: Date) => {
    return new Intl.DateTimeFormat('ro-RO', {
      timeZone: 'Europe/Bucharest',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  }

  const timeString = formatRomanianTime(time)
  const dateString = formatRomanianDate(time)
  const [hours, minutes] = timeString.split(':')

  if (!mounted) {
    return (
      <div className={`flex-1 relative overflow-hidden rounded-2xl bg-transparent border ${borderColor} p-8 flex items-center justify-center`}>
        <p className={`${textColorMuted} text-xl`}>Se încarcă...</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={`flex-1 relative overflow-hidden rounded-2xl bg-transparent border ${borderColor} transition-all duration-300 ${isDarkMode ? 'hover:border-white/30' : 'hover:border-slate-400'}`}
      style={{ paddingTop: '100px', paddingLeft: '2rem', paddingRight: '2rem', paddingBottom: '2rem' }}
    >
      <div className="flex flex-col h-full justify-start items-start">
        <div className="flex items-center justify-start mb-4 w-full">
          <ClockIcon className={`${iconColor}`} style={{ width: '2.4rem', height: '2.4rem' }} />
        </div>
        <div className="flex flex-col items-start">
          {/* Time Display */}
          <div className="flex items-baseline gap-3 mb-6 justify-start">
            <motion.span
              key={hours}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`text-9xl font-bold ${textColor} tabular-nums`}
              style={{ fontSize: '6.8rem', lineHeight: '1' }}
            >
              {hours}
            </motion.span>
            <span className={`text-9xl font-bold ${textColorMuted}`} style={{ fontSize: '6.8rem', lineHeight: '1' }}>:</span>
            <motion.span
              key={minutes}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`text-9xl font-bold ${textColor} tabular-nums`}
              style={{ fontSize: '6.8rem', lineHeight: '1' }}
            >
              {minutes}
            </motion.span>
          </div>
          
          {/* Date Display */}
          <motion.p
            key={dateString}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className={`${textColorMuted} capitalize text-left`}
            style={{ fontSize: '1.6rem' }}
          >
            {dateString}
          </motion.p>
        </div>
      </div>
    </motion.div>
  )
}

