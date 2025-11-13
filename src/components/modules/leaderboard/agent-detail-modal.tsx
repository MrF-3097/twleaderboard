'use client'

import { useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy,
  Mail,
  Phone,
  TrendingUp,
  Calendar,
  Award,
  Star,
  Zap,
  Building2,
} from 'lucide-react'
import type { Agent } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/modal'
import { Card, CardContent } from '@/components/ui/card'

interface AgentDetailModalProps {
  agent: Agent | null
  isOpen: boolean
  onClose: () => void
}

export const AgentDetailModal: React.FC<AgentDetailModalProps> = ({
  agent,
  isOpen,
  onClose,
}) => {
  const isOpenRef = useRef(isOpen)
  const onCloseRef = useRef(onClose)
  const callCountRef = useRef(0)

  // Keep refs up to date
  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const handleOpenChange = useCallback((open: boolean) => {
    callCountRef.current += 1
    
    // Only handle user-initiated close (ESC, click outside, close button)
    if (!open && isOpenRef.current) {
      isOpenRef.current = false
      onCloseRef.current()
    }
  }, [])

  // Don't render Dialog if no agent
  if (!agent) return null

  const achievements = [
    { icon: Trophy, label: 'Top Performer', condition: agent.rank === 1 },
    { icon: Award, label: 'Rising Star', condition: (agent.level || 0) >= 5 },
    { icon: TrendingUp, label: 'Deal Closer', condition: (agent.closed_transactions || 0) >= 10 },
    { icon: Star, label: 'Elite Agent', condition: (agent.xp || 0) >= 1000 },
  ]

  const activeAchievements = achievements.filter((a) => a.condition)

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Agent Profile</DialogTitle>
          <DialogDescription>Detailed statistics and achievements</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header with Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#FFD700]">
                {agent.avatar || agent.profile_picture ? (
                  <img
                    src={agent.avatar || agent.profile_picture}
                    alt={agent.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#203A53] flex items-center justify-center text-white text-3xl font-bold">
                    {agent.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {agent.level && (
                <div className="absolute -bottom-2 -right-2 bg-[#FFD700] text-[#203A53] rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold border-4 border-background">
                  {agent.level}
                </div>
              )}
            </div>

            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-2">{agent.name}</h2>
              <div className="flex items-center gap-2 text-lg text-muted-foreground mb-2">
                <Trophy className="h-5 w-5 text-[#FFD700]" />
                <span>Rank #{agent.rank}</span>
              </div>
              <div className="flex items-center gap-2 text-lg text-muted-foreground">
                <Star className="h-5 w-5 text-[#FFD700]" />
                <span>Level {agent.level || 1}</span>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          {(agent.email || agent.phone) && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3 text-lg">Contact Information</h3>
                <div className="space-y-2">
                  {agent.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{agent.email}</span>
                    </div>
                  )}
                  {agent.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{agent.phone}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-[#203A53] to-[#203A53]/80 text-white">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold mb-1">
                  {agent.closed_transactions || 0}
                </div>
                <div className="text-sm opacity-80">Closed Deals</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#FFD700] to-[#FFD700]/80 text-[#203A53]">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold mb-1">{agent.xp || 0}</div>
                <div className="text-sm opacity-80">Total XP</div>
              </CardContent>
            </Card>

            {agent.total_value !== undefined && (
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold mb-1">
                    €{(agent.total_value / 1000000).toFixed(1)}M
                  </div>
                  <div className="text-sm opacity-80">Total Value</div>
                </CardContent>
              </Card>
            )}

            {agent.active_listings !== undefined && (
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold mb-1">{agent.active_listings}</div>
                  <div className="text-sm opacity-80">Active Listings</div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* XP Progress */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3 text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#FFD700]" />
                Experience Progress
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Level {agent.level || 1}</span>
                  <span>Level {(agent.level || 1) + 1}</span>
                </div>
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#203A53] to-[#FFD700]"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(((agent.xp || 0) % 500) / 500) * 100}%`,
                    }}
                    transition={{ duration: 1 }}
                  />
                </div>
                <div className="text-sm text-muted-foreground text-center">
                  {agent.xp || 0} / {((Math.floor((agent.xp || 0) / 500) + 1) * 500)} XP
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          {activeAchievements.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4 text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-[#FFD700]" />
                  Achievements
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {activeAchievements.map((achievement, index) => (
                    <motion.div
                      key={index}
                      className="flex flex-col items-center gap-2 p-3 bg-[#FFD700]/10 rounded-lg border border-[#FFD700]/30"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <achievement.icon className="h-8 w-8 text-[#FFD700]" />
                      <span className="text-xs text-center font-medium">
                        {achievement.label}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Last Transaction */}
          {agent.last_transaction_date && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3 text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#FFD700]" />
                  Recent Activity
                </h3>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>
                    Last transaction: {new Date(agent.last_transaction_date).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

