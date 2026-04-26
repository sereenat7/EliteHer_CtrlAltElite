import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import hi from './locales/hi.json'
import mr from './locales/mr.json'
import gu from './locales/gu.json'
import ta from './locales/ta.json'
import te from './locales/te.json'
import pa from './locales/pa.json'
import bn from './locales/bn.json'

export const supportedLanguages = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
  { code: 'bn', label: 'বাংলা' },
]

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      mr: { translation: mr },
      gu: { translation: gu },
      ta: { translation: ta },
      te: { translation: te },
      pa: { translation: pa },
      bn: { translation: bn },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    supportedLngs: supportedLanguages.map((l) => l.code),
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n

