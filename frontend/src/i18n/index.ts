import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enCommon from '../locales/en/common.json'
import enLayout from '../locales/en/layout.json'
import enPublic from '../locales/en/public.json'
import hiCommon from '../locales/hi/common.json'
import hiLayout from '../locales/hi/layout.json'
import hiPublic from '../locales/hi/public.json'

export const SUPPORTED_LANGUAGES = ['en', 'hi'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en'

export function isSupportedLanguage(value: string | undefined): value is SupportedLanguage {
  return !!value && (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
}

i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon, layout: enLayout, public: enPublic },
    hi: { common: hiCommon, layout: hiLayout, public: hiPublic },
  },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  ns: ['common', 'layout', 'public'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
})

export default i18n
