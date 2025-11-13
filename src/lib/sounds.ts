// Smooth, ambient sound effect utilities for gamified leaderboard

// Helper to create an ambient pad sound
const createAmbientPad = (
  audioContext: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  volume: number = 0.03
) => {
  // Use triangle wave for warm, soft tone
  const oscillator1 = audioContext.createOscillator()
  const oscillator2 = audioContext.createOscillator()
  const oscillator3 = audioContext.createOscillator()
  
  oscillator1.type = 'triangle'
  oscillator2.type = 'triangle'
  oscillator3.type = 'sine'
  
  // Slightly detuned for richness
  oscillator1.frequency.setValueAtTime(frequency, startTime)
  oscillator2.frequency.setValueAtTime(frequency * 1.005, startTime) // Slight detune
  oscillator3.frequency.setValueAtTime(frequency * 0.5, startTime) // Octave below
  
  // Gain nodes
  const gainNode = audioContext.createGain()
  
  // Very slow attack and release for smooth, ambient feel
  gainNode.gain.setValueAtTime(0, startTime)
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.15) // Slow attack
  gainNode.gain.linearRampToValueAtTime(volume * 0.8, startTime + duration * 0.5)
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration) // Slow release
  
  // Add subtle low-pass filter for warmth
  const filter = audioContext.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(800, startTime)
  filter.Q.setValueAtTime(1, startTime)
  
  // Connect
  oscillator1.connect(filter)
  oscillator2.connect(filter)
  oscillator3.connect(filter)
  filter.connect(gainNode)
  gainNode.connect(audioContext.destination)
  
  // Play
  oscillator1.start(startTime)
  oscillator1.stop(startTime + duration)
  oscillator2.start(startTime)
  oscillator2.stop(startTime + duration)
  oscillator3.start(startTime)
  oscillator3.stop(startTime + duration)
}

// Create a gentle swoosh/whoosh sound
const createSwoosh = (
  audioContext: AudioContext,
  startFreq: number,
  endFreq: number,
  startTime: number,
  duration: number,
  volume: number = 0.02,
  direction: 'up' | 'down' = 'up'
) => {
  const oscillator = audioContext.createOscillator()
  oscillator.type = 'triangle'
  
  // Smooth frequency glide
  oscillator.frequency.setValueAtTime(startFreq, startTime)
  oscillator.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration)
  
  const gainNode = audioContext.createGain()
  const filter = audioContext.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(600, startTime)
  filter.Q.setValueAtTime(0.5, startTime)
  
  // Gentle envelope
  gainNode.gain.setValueAtTime(0, startTime)
  gainNode.gain.linearRampToValueAtTime(volume, startTime + duration * 0.3)
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration)
  
  oscillator.connect(filter)
  filter.connect(gainNode)
  gainNode.connect(audioContext.destination)
  
  oscillator.start(startTime)
  oscillator.stop(startTime + duration)
}

export const playSound = (type: 'rank_up' | 'rank_down' | 'achievement' | 'confetti') => {
  if (typeof window === 'undefined') return

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  
  // Resume audio context if suspended (browsers suspend until user interaction)
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {
      // Silently fail if resume is not possible
    })
  }
  
  const now = audioContext.currentTime

  switch (type) {
    case 'rank_up':
      // Smooth upward swoosh - like a gentle breeze lifting up
      createSwoosh(audioContext, 200, 400, now, 0.6, 0.025, 'up')
      // Add subtle ambient pad for warmth
      createAmbientPad(audioContext, 329.63, now + 0.2, 0.5, 0.015) // E4
      break

    case 'rank_down':
      // Gentle downward drift - calming and neutral
      createSwoosh(audioContext, 350, 200, now, 0.7, 0.02, 'down')
      createAmbientPad(audioContext, 261.63, now + 0.1, 0.6, 0.012) // C4
      break

    case 'achievement':
      // Warm, ambient celebration - like a soft glow
      createAmbientPad(audioContext, 261.63, now, 0.8, 0.025) // C4
      createAmbientPad(audioContext, 329.63, now + 0.1, 0.8, 0.022) // E4
      createAmbientPad(audioContext, 392.00, now + 0.2, 0.9, 0.02) // G4
      // Add gentle high shimmer for magic
      const shimmer = audioContext.createOscillator()
      const shimmerGain = audioContext.createGain()
      shimmer.type = 'triangle'
      shimmer.frequency.setValueAtTime(1046.5, now + 0.3) // C6
      shimmerGain.gain.setValueAtTime(0, now + 0.3)
      shimmerGain.gain.linearRampToValueAtTime(0.008, now + 0.4)
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0)
      shimmer.connect(shimmerGain)
      shimmerGain.connect(audioContext.destination)
      shimmer.start(now + 0.3)
      shimmer.stop(now + 1.0)
      break

    case 'confetti':
      // Soft, magical sparkle - like fairy dust
      const sparkle1 = audioContext.createOscillator()
      const sparkle2 = audioContext.createOscillator()
      const sparkleGain = audioContext.createGain()
      const sparkleFilter = audioContext.createBiquadFilter()
      
      sparkle1.type = 'triangle'
      sparkle2.type = 'sine'
      sparkle1.frequency.setValueAtTime(880, now) // A5
      sparkle2.frequency.setValueAtTime(1108.73, now) // C#6
      
      sparkleFilter.type = 'lowpass'
      sparkleFilter.frequency.setValueAtTime(1500, now)
      sparkleFilter.Q.setValueAtTime(1, now)
      
      sparkleGain.gain.setValueAtTime(0, now)
      sparkleGain.gain.linearRampToValueAtTime(0.015, now + 0.05)
      sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
      
      sparkle1.connect(sparkleFilter)
      sparkle2.connect(sparkleFilter)
      sparkleFilter.connect(sparkleGain)
      sparkleGain.connect(audioContext.destination)
      
      sparkle1.start(now)
      sparkle1.stop(now + 0.4)
      sparkle2.start(now)
      sparkle2.stop(now + 0.4)
      break
  }
}

export const playCelebration = () => {
  playSound('confetti')
  setTimeout(() => playSound('achievement'), 150)
}

