import { Sparkles } from "lucide-react"
import { logUpgradeClick } from "@/core/functions/pro-interest-functions"
import { Button } from "@/components/ui/button"
import { defineCopy, useCopy } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const COPY = defineCopy({
  en: { upgrade: "Upgrade to Pro" },
  ms: { upgrade: "Naik taraf ke Pro" },
})

export function UpgradeToProButton({
  centerId,
  className,
}: {
  centerId: string
  className?: string
}) {
  const t = useCopy(COPY)
  const href = `https://dialisis.my/untuk-pusat-dialisis?from=admin&center=${encodeURIComponent(centerId)}#pro`

  return (
    <Button asChild size="lg" className={cn("gap-2", className)}>
      <a
        href={href}
        target="_blank"
        rel="noopener"
        onClick={() => {
          logUpgradeClick({ data: { centerId } }).catch(() => {})
        }}
      >
        <Sparkles />
        {t.upgrade}
      </a>
    </Button>
  )
}
