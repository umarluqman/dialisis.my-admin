import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Copy, Search, X } from "lucide-react"
import { toast } from "sonner"
import { createInvitation } from "@/core/functions/invitation-functions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { defineCopy, useCopy } from "@/lib/i18n"
import { allCentersQuery } from "./queries"

const MAX_VISIBLE = 100

const COPY = defineCopy({
  en: {
    generated: "Invitation link generated successfully",
    generateFailed: "Failed to generate invitation",
    copied: "Link copied to clipboard",
    title: "Invite a PIC",
    description:
      "The link lets this email sign up and manage the selected centers. It expires in 7 days.",
    email: "PIC email",
    centers: "Centers",
    selected: (count: number) => `${count} selected`,
    remove: (name: string) => `Remove ${name}`,
    search: "Search name, town or state",
    loading: "Loading centers...",
    noMatch: "No centers match your search.",
    showing: (shown: number, total: number) =>
      `Showing ${shown} of ${total}. Refine your search to see more.`,
    generating: "Generating...",
    generate: "Generate invitation link",
    link: "Invitation link",
    copy: "Copy",
  },
  ms: {
    generated: "Pautan jemputan berjaya dijana",
    generateFailed: "Gagal menjana jemputan",
    copied: "Pautan disalin ke papan klip",
    title: "Jemput PIC",
    description:
      "Pautan ini membolehkan pemilik e-mel ini mendaftar dan mengurus pusat yang dipilih. Pautan tamat tempoh dalam 7 hari.",
    email: "E-mel PIC",
    centers: "Pusat",
    selected: (count: number) => `${count} dipilih`,
    remove: (name: string) => `Buang ${name}`,
    search: "Cari nama, bandar atau negeri",
    loading: "Memuatkan pusat...",
    noMatch: "Tiada pusat sepadan dengan carian anda.",
    showing: (shown: number, total: number) =>
      `Memaparkan ${shown} daripada ${total}. Perhalusi carian untuk melihat lagi.`,
    generating: "Menjana...",
    generate: "Jana pautan jemputan",
    link: "Pautan jemputan",
    copy: "Salin",
  },
})

export function InvitationsView() {
  const t = useCopy(COPY)
  const [email, setEmail] = useState("")
  const [centerSearch, setCenterSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const { data: centers = [], isLoading } = useQuery(allCentersQuery)

  const createInvitationMutation = useMutation({
    mutationFn: (data: { email: string; centerIds: string[] }) =>
      createInvitation({ data: { ...data, expiresInDays: 7 } }),
    onSuccess: (data) => {
      setGeneratedLink(`${window.location.origin}/auth/sign-up?invite=${data.token}`)
      toast.success(t.generated)
    },
    onError: (error) => {
      toast.error(error.message || t.generateFailed)
    },
  })

  const toggleCenter = (centerId: string) => {
    setSelectedIds((prev) =>
      prev.includes(centerId) ? prev.filter((id) => id !== centerId) : [...prev, centerId]
    )
    setGeneratedLink(null)
  }

  const handleCopyLink = async () => {
    if (!generatedLink) return
    await navigator.clipboard.writeText(generatedLink)
    toast.success(t.copied)
  }

  const query = centerSearch.trim().toLowerCase()
  const filtered = centers.filter((center) =>
    [center.dialysisCenterName, center.town, center.stateName].some((v) =>
      (v ?? "").toLowerCase().includes(query)
    )
  )
  const selectedCenters = centers.filter((center) => selectedIds.includes(center.id))

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="inviteEmail">{t.email}</Label>
          <Input
            id="inviteEmail"
            type="email"
            placeholder="pic@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setGeneratedLink(null)
            }}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="inviteCenterSearch">{t.centers}</Label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {t.selected(selectedIds.length)}
            </span>
          </div>
          {selectedCenters.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedCenters.map((center) => (
                <Badge key={center.id} variant="secondary" className="gap-1 pr-1">
                  {center.dialysisCenterName}
                  <button
                    type="button"
                    onClick={() => toggleCenter(center.id)}
                    className="rounded-sm p-0.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    aria-label={t.remove(center.dialysisCenterName)}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="inviteCenterSearch"
              type="search"
              placeholder={t.search}
              value={centerSearch}
              onChange={(e) => setCenterSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-72 overflow-y-auto rounded-lg border">
            {isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">{t.loading}</p>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">{t.noMatch}</p>
            ) : (
              <ul className="divide-y">
                {filtered.slice(0, MAX_VISIBLE).map((center) => (
                  <li key={center.id}>
                    <Label
                      htmlFor={`invite-${center.id}`}
                      className="flex cursor-pointer items-center gap-3 px-3 py-2.5 font-normal hover:bg-muted/50"
                    >
                      <Checkbox
                        id={`invite-${center.id}`}
                        checked={selectedIds.includes(center.id)}
                        onCheckedChange={() => toggleCenter(center.id)}
                      />
                      <span className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-3">
                        <span className="truncate sm:flex-1">{center.dialysisCenterName}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {[center.town, center.stateName].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </Label>
                  </li>
                ))}
              </ul>
            )}
            {filtered.length > MAX_VISIBLE && (
              <p className="border-t p-3 text-center text-xs text-muted-foreground">
                {t.showing(MAX_VISIBLE, filtered.length)}
              </p>
            )}
          </div>
        </div>

        <Button
          onClick={() => createInvitationMutation.mutate({ email, centerIds: selectedIds })}
          disabled={!email.trim() || selectedIds.length === 0 || createInvitationMutation.isPending}
        >
          {createInvitationMutation.isPending ? t.generating : t.generate}
        </Button>

        {generatedLink && (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <Label htmlFor="inviteLink">{t.link}</Label>
            <div className="flex gap-2">
              <Input id="inviteLink" value={generatedLink} readOnly className="flex-1 bg-background" />
              <Button variant="outline" onClick={handleCopyLink}>
                <Copy />
                {t.copy}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
