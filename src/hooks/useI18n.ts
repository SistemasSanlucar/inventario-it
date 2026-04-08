import { T, getLang, setLang as setLangBase, type TranslationKeys } from '../i18n'

export function useI18n(): { t: TranslationKeys; lang: string; setLang: (lang: string) => void } {
  return {
    t: T(),
    lang: getLang(),
    setLang: setLangBase,
  }
}
