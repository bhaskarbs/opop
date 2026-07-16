import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enAdmin from '../locales/en/admin.json'
import enAuth from '../locales/en/auth.json'
import enCandidate from '../locales/en/candidate.json'
import enCommon from '../locales/en/common.json'
import enCompany from '../locales/en/company.json'
import enIdeas from '../locales/en/ideas.json'
import enLayout from '../locales/en/layout.json'
import enPublic from '../locales/en/public.json'
import hiAdmin from '../locales/hi/admin.json'
import hiAuth from '../locales/hi/auth.json'
import hiCandidate from '../locales/hi/candidate.json'
import hiCommon from '../locales/hi/common.json'
import hiCompany from '../locales/hi/company.json'
import hiIdeas from '../locales/hi/ideas.json'
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
    en: {
      common: enCommon,
      layout: enLayout,
      public: enPublic,
      auth: enAuth,
      candidate: enCandidate,
      company: enCompany,
      admin: enAdmin,
      ideas: enIdeas,
    },
    hi: {
      common: hiCommon,
      layout: hiLayout,
      public: hiPublic,
      auth: hiAuth,
      candidate: hiCandidate,
      company: hiCompany,
      admin: hiAdmin,
      ideas: hiIdeas,
    },
  },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  ns: ['common', 'layout', 'public', 'auth', 'candidate', 'company', 'admin', 'ideas'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
})

export default i18n
