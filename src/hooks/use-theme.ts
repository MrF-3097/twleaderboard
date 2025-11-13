'use client'

import { useState, useEffect } from 'react'

const SWITCH_TIME = { hour: 16, minute: 45 } // 4:45 PM

export const useTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState(true)

  useEffect(() => {
    const checkTheme = () => {
      const now = new Date()
      const romanianTime = new Intl.DateTimeFormat('ro-RO', {
        timeZone: 'Europe/Bucharest',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now)

      const [hours, minutes] = romanianTime.split(':').map(Number)
      const currentMinutes = hours * 60 + minutes
      const switchMinutes = SWITCH_TIME.hour * 60 + SWITCH_TIME.minute

      // Dark mode after 4:45 PM, light mode before
      setIsDarkMode(currentMinutes >= switchMinutes)
    }

    // Check immediately
    checkTheme()

    // Check every minute
    const interval = setInterval(checkTheme, 60000)

    return () => clearInterval(interval)
  }, [])

  return isDarkMode
}

