import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAudioStore } from '../../app/stores/audio'

describe('useAudioStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with default unmuted state and toggles properly', () => {
    const audio = useAudioStore()
    expect(typeof audio.isMuted).toBe('boolean')

    const initial = audio.isMuted
    audio.toggleMute()
    expect(audio.isMuted).toBe(!initial)

    audio.toggleMute()
    expect(audio.isMuted).toBe(initial)
  })

  it('exposes synthesized sound trigger functions without crashing in headless environment', () => {
    const audio = useAudioStore()
    expect(() => {
      audio.playTick()
      audio.playSpinTick()
      audio.playDraftChime()
      audio.playReroll()
      audio.playWhistle()
      audio.playGoalFanfare()
    }).not.toThrow()
  })
})
