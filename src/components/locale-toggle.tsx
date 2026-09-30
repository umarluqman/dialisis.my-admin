import { LOCALES, useLocale } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const LABELS = { en: "EN", ms: "BM" } as const

export function LocaleToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale()

  return (
    <div
      role="group"
      aria-label="Language / Bahasa"
      className={cn("inline-flex rounded-md border p-0.5 text-xs font-medium", className)}
    >
      {LOCALES.map((value) => (
        <button
          key={value}
          type="button"
          lang={value}
          aria-pressed={locale === value}
          onClick={() => setLocale(value)}
          className={cn(
            "rounded-sm px-2 py-1 transition-colors",
            locale === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {LABELS[value]}
        </button>
      ))}
    </div>
  )
}
