import { defineStore } from 'pinia'

export const useAudioStore = defineStore('audio', () => {
  // useCookie (not localStorage) so SSR and the client agree on first
  // render -- the cookie travels with the request, unlike localStorage,
  // which only exists client-side and previously forced a mute preference
  // read after the fact, producing a hydration mismatch on the header's
  // mute icon and its aria-label for anyone who had muted before.
  const isMuted = useCookie<boolean>('eurodraft_sound_muted', {
    default: () => false,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax'
  })
  let audioCtx: AudioContext | null = null

  function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioContextClass) {
        audioCtx = new AudioContextClass()
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {})
    }
    return audioCtx
  }

  function toggleMute() {
    isMuted.value = !isMuted.value
    if (!isMuted.value) {
      playTick()
    }
  }

  // 1. Crisp UI Button Tick
  function playTick() {
    if (isMuted.value) return
    const ctx = getAudioContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(900, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.035)

    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.036)
  }

  // 2. Roulette Spinning Ratchet Tick
  function playSpinTick() {
    if (isMuted.value) return
    const ctx = getAudioContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(450 + Math.random() * 200, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.025)

    gain.gain.setValueAtTime(0.06, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.026)
  }

  // 3. Draft Placement Chime (Triumphant Major Triad: C5 - E5 - G5)
  function playDraftChime() {
    if (isMuted.value) return
    const ctx = getAudioContext()
    if (!ctx) return

    const freqs = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.04)

      gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.04)
      gain.gain.linearRampToValueAtTime(0.09, ctx.currentTime + idx * 0.04 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.04 + 0.45)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(ctx.currentTime + idx * 0.04)
      osc.stop(ctx.currentTime + idx * 0.04 + 0.46)
    })
  }

  // 4. Reroll Sweep / Swoosh
  function playReroll() {
    if (isMuted.value) return
    const ctx = getAudioContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(250, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 0.12)

    gain.gain.setValueAtTime(0.07, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.13)
  }

  // 5. Match Referee Whistle (bright pealess-whistle trill, not a sustained horn chord)
  function playWhistle() {
    if (isMuted.value) return
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const duration = 0.26

    // Harmonically rich core tone, narrowed to a shrill band via bandpass filter
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(3500, now)
    osc.frequency.linearRampToValueAtTime(3700, now + duration)

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(3650, now)
    filter.Q.setValueAtTime(7, now)

    const mainGain = ctx.createGain()
    mainGain.gain.setValueAtTime(0.0001, now)
    mainGain.gain.exponentialRampToValueAtTime(0.11, now + 0.008)
    mainGain.gain.setValueAtTime(0.11, now + duration - 0.06)
    mainGain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    // Fast tremolo emulating the turbulent warble of a pealess (multi-chamber) whistle
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.setValueAtTime(27, now)
    const lfoGain = ctx.createGain()
    lfoGain.gain.setValueAtTime(0.045, now)
    lfo.connect(lfoGain)
    lfoGain.connect(mainGain.gain)

    osc.connect(filter)
    filter.connect(mainGain)
    mainGain.connect(ctx.destination)

    osc.start(now)
    lfo.start(now)
    osc.stop(now + duration + 0.02)
    lfo.stop(now + duration + 0.02)
  }

  // 6. Goal / Tournament Win Fanfare
  function playGoalFanfare() {
    if (isMuted.value) return
    const ctx = getAudioContext()
    if (!ctx) return

    const chord = [392.00, 523.25, 659.25, 783.99] // G4, C5, E5, G5
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05)

      gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.05)
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + idx * 0.05 + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.05 + 0.6)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(ctx.currentTime + idx * 0.05)
      osc.stop(ctx.currentTime + idx * 0.05 + 0.62)
    })
  }

  return {
    isMuted,
    toggleMute,
    playTick,
    playSpinTick,
    playDraftChime,
    playReroll,
    playWhistle,
    playGoalFanfare
  }
})
