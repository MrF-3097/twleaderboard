'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface ConfettiProps {
  show: boolean
  onComplete?: () => void
}

export const Confetti: React.FC<ConfettiProps> = ({ show, onComplete }) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; color: string }>>([])
  const [windowHeight, setWindowHeight] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowHeight(window.innerHeight)
    }
  }, [])

  useEffect(() => {
    if (show) {
      const colors = ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1', '#F7B731']
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
      }))
      setParticles(newParticles)

      const timer = setTimeout(() => {
        setParticles([])
        onComplete?.()
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  if (!show || particles.length === 0 || windowHeight === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-3 h-3 rounded-full"
          style={{
            left: `${particle.x}%`,
            top: '-20px',
            backgroundColor: particle.color,
          }}
          initial={{ y: 0, opacity: 1, rotate: 0 }}
          animate={{
            y: windowHeight + 100,
            opacity: [1, 1, 0],
            rotate: Math.random() * 720,
            x: (Math.random() - 0.5) * 200,
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            ease: 'easeIn',
          }}
        />
      ))}
    </div>
  )
}

