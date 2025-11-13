'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useTheme } from '@/hooks/use-theme'

interface ThemeContextType {
  isDarkMode: boolean
}

const ThemeContext = createContext<ThemeContextType>({ isDarkMode: true })

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const isDarkMode = useTheme()

  return (
    <ThemeContext.Provider value={{ isDarkMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useThemeContext = () => useContext(ThemeContext)

