import { getCountryName } from '~/utils/country'

/** Localized country/nation display name, keyed by the same country codes as `countries.*` in i18n/locales/*.json. Falls back to the English name (getCountryName) for any code not yet covered by a locale. */
export function useCountryName() {
  const { t } = useI18n()
  return (code: string) => {
    const clean = (code || '').toLowerCase().trim()
    return t(`countries.${clean}`, getCountryName(code))
  }
}
