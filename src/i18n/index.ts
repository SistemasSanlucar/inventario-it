import { es } from './es'
import { en } from './en'

export type TranslationKeys = { [K in keyof typeof es]: string }

const TRANSLATIONS: Record<string, TranslationKeys> = { es, en }

let currentLang = localStorage.getItem('inv_lang') || 'es'

export function T(lang?: string): TranslationKeys {
  return TRANSLATIONS[lang || currentLang] || TRANSLATIONS.es
}

export function getLang(): string {
  return currentLang
}

export function setLang(lang: string): void {
  currentLang = lang
  localStorage.setItem('inv_lang', lang)
}
