export function getRandomAnimationDuration(baseMs = 1250): number {
  // Random variance between -10% and +10%
  const variance = (Math.random() * 0.2) - 0.1
  return Math.round(baseMs * (1 + variance))
}

export const useAppLoading = () => {
  const isLoading = useState<boolean>('app_is_loading', () => false)
  const loadingMessage = useState<string | null>('app_loading_message', () => null)
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  function show(message?: string, durationMs?: number) {
    if (timeoutId) clearTimeout(timeoutId)
    loadingMessage.value = message ?? null
    isLoading.value = true

    // If duration specified, use it; otherwise use randomized full animation cycle duration (~1250ms ± 10%)
    const effectiveDuration = durationMs ?? getRandomAnimationDuration(1250)

    timeoutId = setTimeout(() => {
      hide()
    }, effectiveDuration)
  }

  function hide() {
    if (timeoutId) clearTimeout(timeoutId)
    isLoading.value = false
    setTimeout(() => {
      loadingMessage.value = null
    }, 450)
  }

  return {
    isLoading,
    loadingMessage,
    show,
    hide,
    getRandomAnimationDuration
  }
}
