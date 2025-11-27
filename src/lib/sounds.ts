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


/**
 * Play sound when transactions/rank changes occur.
 * ONLY plays the MP3 bell sound - no other sounds are generated.
 */
export const playSound = (type: 'rank_up' | 'rank_down' | 'achievement' | 'confetti') => {
  if (typeof window === 'undefined') return

  // For rank changes (when transactions are made), ONLY play the MP3 bell sound
  if (type === 'rank_up' || type === 'rank_down') {
    playRankChangeSound()
    return
  }

  // Other sound types are not used - do nothing
  // This ensures ONLY the MP3 bell sound plays on transactions
}

export const playCelebration = () => {
  playSound('confetti')
  setTimeout(() => playSound('achievement'), 150)
}

