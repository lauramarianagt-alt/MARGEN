import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en/translation.json'
import es from './locales/es/translation.json'

const supportedLanguages = ['es', 'en']

function getInitialLanguage() {
  const storedLanguage = localStorage.getItem('margen_language')

  if (supportedLanguages.includes(storedLanguage)) {
    return storedLanguage
  }

  const browserLanguage = navigator.language.slice(0, 2).toLowerCase()

  if (supportedLanguages.includes(browserLanguage)) {
    return browserLanguage
  }

  return 'es'
}

i18n.use(initReactI18next).init({
  resources: {
    es: {
      translation: es,
    },
    en: {
      translation: en,
    },
  },

  lng: getInitialLanguage(),
  fallbackLng: 'es',

  interpolation: {
    escapeValue: false,
  },
})

export default i18n
