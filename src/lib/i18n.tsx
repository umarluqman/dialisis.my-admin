import { createContext, useContext, useState, type ReactNode } from "react"
import { createIsomorphicFn } from "@tanstack/react-start"
import { getCookie } from "@tanstack/react-start/server"

export const LOCALES = ["en", "ms"] as const
export type Locale = (typeof LOCALES)[number]

const LOCALE_COOKIE = "locale"

export const INTL_LOCALE: Record<Locale, string> = { en: "en-MY", ms: "ms-MY" }

export function dateFormats(
  options: Intl.DateTimeFormatOptions
): Record<Locale, Intl.DateTimeFormat> {
  return {
    en: new Intl.DateTimeFormat(INTL_LOCALE.en, options),
    ms: new Intl.DateTimeFormat(INTL_LOCALE.ms, options),
  }
}

function toLocale(value: string | undefined): Locale {
  return value === "ms" ? "ms" : "en"
}

export const readLocale = createIsomorphicFn()
  .server(() => toLocale(getCookie(LOCALE_COOKIE)))
  .client(() =>
    toLocale(document.cookie.match(/(?:^|; )locale=(\w+)/)?.[1])
  )

const LocaleContext = createContext<{
  locale: Locale
  setLocale: (locale: Locale) => void
}>({ locale: "en", setLocale: () => {} })

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale
  children: ReactNode
}) {
  const [locale, setLocaleState] = useState(initialLocale)

  const setLocale = (next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
    document.documentElement.lang = next
    setLocaleState(next)
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}

// `ms` must mirror `en` exactly, so a missing translation fails type-checking.
export function defineCopy<T>(copy: { en: T; ms: NoInfer<T> }) {
  return copy
}

export function useCopy<T>(copy: { en: T; ms: T }): T {
  return copy[useLocale().locale]
}
