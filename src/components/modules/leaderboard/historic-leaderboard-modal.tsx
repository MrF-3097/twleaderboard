'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Save } from 'lucide-react'
import { useThemeContext } from '@/contexts/theme-context'
import { AgentCard } from './agent-card'
import type { Agent, AgentStats } from '@/types'
import {
  getAvailableMonths,
  loadMonthlySnapshot,
  getMonthNameRo,
  saveSnapshotForMonth,
  type HistoricalLeaderboardSnapshot,
  type AvailableMonth,
} from '@/lib/historical-leaderboard-storage'

interface HistoricLeaderboardModalProps {
  isOpen: boolean
  onClose: () => void
  currentAgents?: Agent[] // Current live agents data
  currentStats?: AgentStats | null // Current live stats data
}

/**
 * Keyboard event handler for buttons (TV remote compatibility)
 * Triggers action on Enter or Space key
 */
const handleButtonKeyDown = (
  event: React.KeyboardEvent,
  action: () => void,
  isDisabled: boolean
) => {
  if (isDisabled) return
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault()
    action()
  }
}

const DEFAULT_SCREEN_HEIGHT = 1080
const AGENTS_VISIBLE = 10
const CARD_GAP = 3
const HEADER_HEIGHT = 120
const MARGIN_TOP_PERCENT = 3
const SIZE_MULTIPLIER = 0.99

/**
 * Calculate dynamic scaling factor based on number of agents
 */
const calculateScaling = (agentCount: number, actualScreenHeight: number = DEFAULT_SCREEN_HEIGHT): number => {
  if (agentCount === 0) return 1
  
  const marginTop = actualScreenHeight * (MARGIN_TOP_PERCENT / 100)
  const availableHeight = actualScreenHeight - marginTop - HEADER_HEIGHT
  const totalGaps = Math.max(0, (agentCount - 1) * CARD_GAP)
  const availableForCards = availableHeight - totalGaps
  const baseCardHeight = 126
  const maxCardHeight = availableForCards / agentCount
  let scale = maxCardHeight / baseCardHeight
  const minReadableScale = 0.5
  
  if (scale < minReadableScale) {
    const reducedBaseHeight = 110
    const reducedScale = maxCardHeight / reducedBaseHeight
    scale = Math.max(minReadableScale, reducedScale)
  } else {
    scale = Math.max(minReadableScale, scale)
  }
  
  scale = Math.min(1.1, scale)
  return scale * SIZE_MULTIPLIER
}

export const HistoricLeaderboardModal: React.FC<HistoricLeaderboardModalProps> = ({
  isOpen,
  onClose,
  currentAgents = [],
  currentStats = null,
}) => {
  const { isDarkMode } = useThemeContext()
  const [availableMonths, setAvailableMonths] = useState<AvailableMonth[]>([])
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0)
  const [currentSnapshot, setCurrentSnapshot] = useState<HistoricalLeaderboardSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [viewportHeight, setViewportHeight] = useState(DEFAULT_SCREEN_HEIGHT)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [selectedSaveMonth, setSelectedSaveMonth] = useState<{ year: number; month: number }>({
    year: 2025,
    month: 12,
  })
  
  // Refs for button focus management (TV navigation)
  const prevButtonRef = useRef<HTMLButtonElement>(null)
  const nextButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Get viewport height
  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateViewportHeight = () => {
      setViewportHeight(window.innerHeight)
    }

    updateViewportHeight()
    window.addEventListener('resize', updateViewportHeight)
    return () => window.removeEventListener('resize', updateViewportHeight)
  }, [])

  // Global keyboard navigation for TV remotes
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Don't interfere with save dialog
      if (saveDialogOpen) return

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          if (currentMonthIndex < availableMonths.length - 1) {
            handlePreviousMonth()
          }
          break
        case 'ArrowRight':
          event.preventDefault()
          if (currentMonthIndex > 0) {
            handleNextMonth()
          }
          break
        case 'Escape':
          event.preventDefault()
          onClose()
          break
        case 'Backspace':
          // Some TV remotes use Backspace for back button
          event.preventDefault()
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isOpen, saveDialogOpen, currentMonthIndex, availableMonths.length, onClose])

  // Load available months when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      getAvailableMonths()
        .then((months) => {
          setAvailableMonths(months)
          
          if (months.length > 0) {
            // Start with the most recent month (index 0)
            setCurrentMonthIndex(0)
            return loadSnapshotForMonthAsync(months[0])
          }
        })
        .catch((err) => {
          console.error('[Historic Leaderboard] Error loading available months:', err)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [isOpen])

  // Load snapshot for a specific month (async)
  const loadSnapshotForMonthAsync = async (monthInfo: { year: number; month: number }) => {
    setIsLoading(true)
    try {
      const snapshot = await loadMonthlySnapshot(monthInfo.year, monthInfo.month)
      setCurrentSnapshot(snapshot)
    } catch (err) {
      console.error('[Historic Leaderboard] Error loading snapshot:', err)
      setCurrentSnapshot(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Navigate to previous month
  const handlePreviousMonth = () => {
    if (currentMonthIndex < availableMonths.length - 1) {
      const newIndex = currentMonthIndex + 1
      setCurrentMonthIndex(newIndex)
      loadSnapshotForMonthAsync(availableMonths[newIndex])
    }
  }

  // Navigate to next month
  const handleNextMonth = () => {
    if (currentMonthIndex > 0) {
      const newIndex = currentMonthIndex - 1
      setCurrentMonthIndex(newIndex)
      loadSnapshotForMonthAsync(availableMonths[newIndex])
    }
  }

  // Save current data as a specific month (async)
  const handleSaveAsMonth = async () => {
    if (currentAgents.length === 0) {
      alert('Nu există date curente pentru a salva')
      return
    }

    setIsSaving(true)
    
    try {
      const success = await saveSnapshotForMonth(
        selectedSaveMonth.year,
        selectedSaveMonth.month,
        currentAgents,
        currentStats
      )

      if (success) {
        // Refresh available months
        const months = await getAvailableMonths()
        setAvailableMonths(months)

        // Find and navigate to the newly saved month
        const savedIndex = months.findIndex(
          (m) => m.year === selectedSaveMonth.year && m.month === selectedSaveMonth.month
        )
        if (savedIndex !== -1) {
          setCurrentMonthIndex(savedIndex)
          await loadSnapshotForMonthAsync(months[savedIndex])
        }

        setSaveDialogOpen(false)
        alert(
          `Datele au fost salvate pentru ${getMonthNameRo(selectedSaveMonth.month)} ${selectedSaveMonth.year}`
        )
      } else {
        alert('Eroare la salvarea datelor. Încercați din nou.')
      }
    } catch (err) {
      console.error('[Historic Leaderboard] Error saving snapshot:', err)
      alert('Eroare la salvarea datelor. Încercați din nou.')
    } finally {
      setIsSaving(false)
    }
  }

  // Generate list of months to save (last 12 months)
  const monthsToSave = useMemo(() => {
    const result: Array<{ year: number; month: number; label: string }> = []
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    for (let i = 0; i < 12; i++) {
      let month = currentMonth - i
      let year = currentYear

      while (month <= 0) {
        month += 12
        year -= 1
      }

      result.push({
        year,
        month,
        label: `${getMonthNameRo(month)} ${year}`,
      })
    }

    return result
  }, [])

  // Calculate scale for agent cards
  const scale = useMemo(() => {
    const agentCount = currentSnapshot?.agents.length || AGENTS_VISIBLE
    return calculateScaling(agentCount, viewportHeight)
  }, [currentSnapshot?.agents.length, viewportHeight])

  // Get current month display name
  const currentMonthDisplay = useMemo(() => {
    if (availableMonths.length === 0 || currentMonthIndex >= availableMonths.length) {
      return 'Nicio dată disponibilă'
    }
    const monthInfo = availableMonths[currentMonthIndex]
    const monthName = getMonthNameRo(monthInfo.month)
    return `${monthName} ${monthInfo.year}`
  }, [availableMonths, currentMonthIndex])

  const textColor = isDarkMode ? 'text-white' : 'text-slate-900'
  const textColorMuted = isDarkMode ? 'text-white/70' : 'text-slate-600'
  const borderColor = isDarkMode ? 'border-white/20' : 'border-slate-300'
  const bgColor = isDarkMode ? 'bg-[#1F2933]' : 'bg-[#F8FAFC]'
  const cardBg = isDarkMode ? 'bg-transparent' : 'bg-white/50'

  const agents = currentSnapshot?.agents || []
  const stats = currentSnapshot?.stats || null

  // Render modal in portal to ensure it's above everything
  if (typeof window === 'undefined') {
    return null
  }

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 z-[9998]"
            onClick={onClose}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          />

          {/* Modal - Full Screen */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`fixed inset-0 z-[9999] ${bgColor} flex flex-col overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0,
              width: '100vw',
              height: '100vh',
              margin: 0,
              padding: 0,
            }}
          >
            {/* Header */}
            <div
              className={`flex items-center justify-between px-12 py-8 border-b ${borderColor} flex-shrink-0`}
              style={{ minHeight: '140px' }}
            >
              <div className="flex items-center gap-6 flex-1">
                {/* Previous Month Button */}
                <button
                  onClick={handlePreviousMonth}
                  disabled={currentMonthIndex >= availableMonths.length - 1}
                  className={`p-3 rounded-lg border ${borderColor} transition-all ${
                    currentMonthIndex >= availableMonths.length - 1
                      ? 'opacity-50 cursor-not-allowed'
                      : isDarkMode
                      ? 'hover:bg-white/10 hover:border-white/30'
                      : 'hover:bg-slate-100 hover:border-slate-400'
                  }`}
                  aria-label="Luna precedentă"
                >
                  <ChevronLeft className={`h-6 w-6 ${textColor}`} />
                </button>

                {/* Month Display */}
                <div className="flex-1 text-center">
                  <h2 className={`text-5xl font-bold ${textColor} mb-3`}>
                    Clasament Istoric
                  </h2>
                  <p className={`text-3xl ${textColorMuted}`}>
                    {currentMonthDisplay}
                  </p>
                  {availableMonths.length > 0 && (
                    <p className={`text-lg ${textColorMuted} mt-2`}>
                      {currentMonthIndex + 1} / {availableMonths.length}
                    </p>
                  )}
                </div>

                {/* Next Month Button */}
                <button
                  onClick={handleNextMonth}
                  disabled={currentMonthIndex === 0}
                  className={`p-3 rounded-lg border ${borderColor} transition-all ${
                    currentMonthIndex === 0
                      ? 'opacity-50 cursor-not-allowed'
                      : isDarkMode
                      ? 'hover:bg-white/10 hover:border-white/30'
                      : 'hover:bg-slate-100 hover:border-slate-400'
                  }`}
                  aria-label="Luna următoare"
                >
                  <ChevronRight className={`h-6 w-6 ${textColor}`} />
                </button>
              </div>

              {/* Save Button */}
              {currentAgents.length > 0 && (
                <button
                  onClick={() => setSaveDialogOpen(true)}
                  className={`ml-6 p-3 rounded-lg border ${borderColor} transition-all ${
                    isDarkMode
                      ? 'hover:bg-green-600/20 hover:border-green-400/50'
                      : 'hover:bg-green-100 hover:border-green-400'
                  }`}
                  aria-label="Salvează ca lună istorică"
                  title="Salvează datele curente ca snapshot istoric"
                >
                  <Save className={`h-6 w-6 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                </button>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className={`ml-4 p-3 rounded-lg border ${borderColor} transition-all ${
                  isDarkMode
                    ? 'hover:bg-white/10 hover:border-white/30'
                    : 'hover:bg-slate-100 hover:border-slate-400'
                }`}
                aria-label="Închide"
              >
                <X className={`h-6 w-6 ${textColor}`} />
              </button>
            </div>

            {/* Save Dialog */}
            <AnimatePresence>
              {saveDialogOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50"
                  onClick={() => setSaveDialogOpen(false)}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className={`text-2xl font-bold ${textColor} mb-4`}>
                      Salvează Snapshot Istoric
                    </h3>
                    <p className={`${textColorMuted} mb-6`}>
                      Salvează datele curente ({currentAgents.length} agenți) ca snapshot pentru o lună specifică:
                    </p>

                    {/* Month Selector */}
                    <select
                      value={`${selectedSaveMonth.year}-${selectedSaveMonth.month}`}
                      onChange={(e) => {
                        const [year, month] = e.target.value.split('-').map(Number)
                        setSelectedSaveMonth({ year, month })
                      }}
                      className={`w-full p-4 rounded-lg border ${borderColor} ${
                        isDarkMode
                          ? 'bg-slate-700 text-white'
                          : 'bg-gray-50 text-slate-900'
                      } text-lg mb-6`}
                    >
                      {monthsToSave.map((m) => (
                        <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                          {m.label}
                        </option>
                      ))}
                    </select>

                    {/* Buttons */}
                    <div className="flex gap-4">
                      <button
                        onClick={() => setSaveDialogOpen(false)}
                        disabled={isSaving}
                        className={`flex-1 py-3 rounded-lg border ${borderColor} ${textColor} transition-all ${
                          isDarkMode
                            ? 'hover:bg-white/10'
                            : 'hover:bg-slate-100'
                        } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Anulează
                      </button>
                      <button
                        onClick={handleSaveAsMonth}
                        disabled={isSaving}
                        className={`flex-1 py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-all ${
                          isSaving ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isSaving ? 'Se salvează...' : 'Salvează'}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Content */}
            <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <p className={`text-2xl ${textColorMuted}`}>Se încarcă...</p>
                </div>
              ) : !currentSnapshot || agents.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className={`text-2xl ${textColorMuted}`}>
                    Nu există date disponibile pentru această lună
                  </p>
                </div>
              ) : (
                <div className="w-full max-w-[90%] mx-auto py-8 px-8">
                  {/* Stats Summary */}
                  {stats && (
                    <div
                      className={`grid grid-cols-3 gap-4 mb-8 p-6 rounded-2xl border ${borderColor} ${cardBg}`}
                    >
                      <div className="text-center">
                        <p className={`text-sm ${textColorMuted} mb-2`}>
                          Total Tranzacții
                        </p>
                        <p className={`text-3xl font-bold ${textColor}`}>
                          {stats.total_transactions.toLocaleString('ro-RO')}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className={`text-sm ${textColorMuted} mb-2`}>
                          Total Comision
                        </p>
                        <p className={`text-3xl font-bold ${textColor}`}>
                          €{stats.total_commission.toLocaleString('ro-RO', {
                            maximumFractionDigits: 0,
                          })}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className={`text-sm ${textColorMuted} mb-2`}>
                          Total Agenți
                        </p>
                        <p className={`text-3xl font-bold ${textColor}`}>
                          {stats.total_agents}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Leaderboard */}
                  <div
                    className={`rounded-2xl ${cardBg} border ${borderColor} p-6`}
                  >
                    <div
                      className="flex flex-col"
                      style={{
                        gap: '4px',
                        paddingTop: `${15 * scale}px`,
                        paddingBottom: `${15 * scale}px`,
                      }}
                    >
                      {agents.map((agent, index) => (
                        <div
                          key={agent.id}
                          style={{
                            flexShrink: 0,
                          }}
                        >
                          <AgentCard
                            agent={agent}
                            index={index}
                            onClick={() => {}} // No click action in historic view
                            scale={scale}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(modalContent, document.body)
}

