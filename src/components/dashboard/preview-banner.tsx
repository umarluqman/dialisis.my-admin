import { useMutation } from "@tanstack/react-query"
import { stopPreview } from "@/core/functions/preview-functions"
import { Button } from "@/components/ui/button"
import { defineCopy, useCopy } from "@/lib/i18n"

const COPY = defineCopy({
  en: { previewAs: "Preview as", exit: "Exit preview" },
  ms: { previewAs: "Pratonton sebagai", exit: "Keluar pratonton" },
})

export function PreviewBanner({ label }: { label: string }) {
  const t = useCopy(COPY)
  const exit = useMutation({
    mutationFn: () => stopPreview(),
    onSuccess: () => window.location.assign("/dashboard"),
  })

  return (
    <div className="flex items-center justify-between gap-3 bg-primary px-4 py-2 text-sm text-primary-foreground">
      <span className="truncate">
        {t.previewAs} <span className="font-semibold">{label}</span>
      </span>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => exit.mutate()}
        disabled={exit.isPending}
      >
        {t.exit}
      </Button>
    </div>
  )
}
