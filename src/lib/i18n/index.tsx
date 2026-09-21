import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getLang, setLang as setActiveLang, subscribeLang, type Lang } from './locale'
import { dictionaries, type Dict } from './dict'

export type { Lang } from './locale'
export { LANGS } from './locale'
export type { Dict } from './dict'

type I18nContextValue = { lang: Lang; setLang: (l: Lang) => void; t: Dict }

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getLang)

  // Ngôn ngữ đổi được từ ngoài React (locale.setLang) — bám theo để re-render.
  useEffect(() => subscribeLang(setLangState), [])

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = dictionaries[lang].common.appTitle
  }, [lang])

  const value: I18nContextValue = { lang, setLang: setActiveLang, t: dictionaries[lang] }
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (ctx) return ctx
  // Render ngoài provider (test render component trần, portal lạc cây):
  // fallback về từ điển hiện hành thay vì đổ lỗi — đổi ngôn ngữ sẽ không
  // re-render ở cây lạc này, nhưng app thật luôn có provider ở gốc.
  const lang = getLang()
  return { lang, setLang: setActiveLang, t: dictionaries[lang] }
}

/** Từ điển của ngôn ngữ đang bật: `const t = useT()` → `t.common.save`. */
export function useT(): Dict {
  return useI18n().t
}

/** Đọc/đổi ngôn ngữ (dùng ở màn Ngôn ngữ). */
export function useLang(): { lang: Lang; setLang: (l: Lang) => void } {
  const { lang, setLang } = useI18n()
  return { lang, setLang }
}

/**
 * Từ điển ngoài cây React (tầng lỗi, report.ts, data/*).
 * Trong component luôn dùng useT() để đổi ngôn ngữ là re-render ngay.
 */
export function t(): Dict {
  return dictionaries[getLang()]
}
