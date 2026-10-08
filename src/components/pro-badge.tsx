import { Lock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function ProBadge({ title }: { title?: string }) {
  return (
    <Badge variant="secondary" className="gap-1" title={title}>
      <Lock className="size-3" />
      Pro
    </Badge>
  )
}
