// Smooth, ambient sound effect utilities for gamified leaderboard

// Cache for the rank change audio to avoid reloading on each play
let rankChangeAudio: HTMLAudioElement | null = null
let audioUnlocked = false

/**
 * Unlock audio for autoplay (browsers require user interaction first)
 * This should be called on first user interaction to allow autoplay later
 */
export const unlockAudio = () => {
  if (typeof window === 'undefined' || audioUnlocked) return

  try {
    // Create a dummy audio context to unlock audio
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        audioUnlocked = true
        console.log('[Sounds] Audio unlocked for autoplay')
      }).catch((error) => {
        console.warn('[Sounds] Could not unlock audio:', error)
      })
    } else {
      audioUnlocked = true
    }

    // Also try to load and play a silent sound to unlock HTML5 Audio
    if (!rankChangeAudio) {
      rankChangeAudio = new Audio('/rank-change.mp3')
      rankChangeAudio.preload = 'auto'
      rankChangeAudio.volume = 1.0
      
      // Try to play and immediately pause to unlock autoplay
      rankChangeAudio.play().then(() => {
        rankChangeAudio!.pause()
        rankChangeAudio!.currentTime = 0
        audioUnlocked = true
        console.log('[Sounds] HTML5 Audio unlocked for autoplay')
      }).catch((error) => {
        console.warn('[Sounds] Could not unlock HTML5 Audio:', error)
      })
    }
  } catch (error) {
    console.error('[Sounds] Error unlocking audio:', error)
  }
}

/**
 * Load and play the rank change MP3 file.
 * Uses HTML5 Audio API for better compatibility and simpler playback.
 */
const playRankChangeSound = () => {
  if (typeof window === 'undefined') {
    console.warn('[Sounds] Window not available')
    return
  }

  try {
    // Create audio element if it doesn't exist
    if (!rankChangeAudio) {
      rankChangeAudio = new Audio('/rank-change.mp3')
      rankChangeAudio.preload = 'auto'
      rankChangeAudio.volume = 1.0 // Full volume, adjust if needed
      
      // Set up error handler for loading issues
      rankChangeAudio.addEventListener('error', (e) => {
        console.error('[Sounds] Audio loading error:', e)
        const audio = rankChangeAudio as HTMLAudioElement
        if (audio.error) {
          console.error('[Sounds] Audio error code:', audio.error.code, 'message:', audio.error.message)
        }
      })
      
      // Log when audio is loaded successfully
      rankChangeAudio.addEventListener('loadeddata', () => {
        console.log('[Sounds] Audio file loaded successfully')
      })
    }

    // Try to unlock audio if not already unlocked
    if (!audioUnlocked) {
      unlockAudio()
    }

    // Check if audio is ready
    if (rankChangeAudio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
      // Reset and play the sound
      rankChangeAudio.currentTime = 0
      const playPromise = rankChangeAudio.play()
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('[Sounds] Rank change sound played successfully')
        }).catch((error) => {
          console.warn('[Sounds] Could not play rank change sound:', error)
          console.warn('[Sounds] This might be due to browser autoplay policy. User interaction may be required.')
          // Try to unlock audio for next time
          unlockAudio()
        })
      }
    } else {
      // If not ready, wait for it to load
      rankChangeAudio.addEventListener('canplay', () => {
        rankChangeAudio!.currentTime = 0
        rankChangeAudio!.play().then(() => {
          console.log('[Sounds] Rank change sound played after loading')
        }).catch((error) => {
          console.warn('[Sounds] Could not play rank change sound after loading:', error)
          unlockAudio()
        })
      }, { once: true })
    }
  } catch (error) {
    console.error('[Sounds] Error playing rank change sound:', error)
  }
}

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

  // Handle rank changes with MP3 file (no AudioContext needed)
  if (type === 'rank_up' || type === 'rank_down') {
    playRankChangeSound()
    return
  }

  // For other sounds, use Web Audio API
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  
  // Resume audio context if suspended (browsers suspend until user interaction)
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {
      // Silently fail if resume is not possible
    })
  }
  
  const now = audioContext.currentTime

  switch (type) {

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

