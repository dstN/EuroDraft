export default defineI18nConfig(() => ({
  // Without this, a missing key resolves to the key string itself (vue-i18n's
  // documented behavior with no fallback configured), which is a truthy
  // string -- silently defeating any `$t('key') || 'fallback'` guard in
  // templates. English is the reference locale all others are diffed
  // against (see tests/unit/i18n-parity.test.ts), so it's the correct fallback.
  fallbackLocale: 'en'
}))
