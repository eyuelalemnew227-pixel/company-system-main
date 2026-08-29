import * as React from 'react'
import { STRINGS, type Lang, type StringKey } from '@/lib/i18n'

interface I18nContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: StringKey) => string
}

const I18nContext = React.createContext<I18nContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (k) => k as string,
})

export function useI18n() {
  return React.useContext(I18nContext)
}

export function I18nProvider({ children, initialPreferredLang }: { children: React.ReactNode; initialPreferredLang?: Lang | null }) {
  const [lang, setLangState] = React.useState<Lang>('en')

  React.useEffect(() => {
    const stored = localStorage.getItem('kaldi_lang') as Lang | null
    if (stored === 'en' || stored === 'am') {
      setLangState(stored)
    } else if (initialPreferredLang === 'en' || initialPreferredLang === 'am') {
      setLangState(initialPreferredLang)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = React.useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem('kaldi_lang', l)
  }, [])

  const t = React.useCallback((key: StringKey) => {
    return (STRINGS[lang] as Record<string, string>)[key as string] || (STRINGS.en as Record<string, string>)[key as string] || (key as string)
  }, [lang])

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}
