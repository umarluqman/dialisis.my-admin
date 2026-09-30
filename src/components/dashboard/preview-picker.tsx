import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Eye, Search } from "lucide-react"
import { toast } from "sonner"
import { getPreviewOptions, startPreview } from "@/core/functions/preview-functions"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { defineCopy, useCopy } from "@/lib/i18n"

const MAX_VISIBLE = 50

type Target = { companyId: string } | { centerId: string }

const COPY = defineCopy({
  en: {
    startFailed: "Failed to start preview",
    title: "Preview as PIC",
    description: "See the dashboard exactly as a PIC of these centres would. Read-only.",
    search: "Search brand, centre, town or state",
    loading: "Loading...",
    brands: "Brands",
    centres: (count: number) => `${count} ${count === 1 ? "centre" : "centres"}`,
    singleCentre: "Single centre",
    noMatch: "No centres match.",
    showing: (shown: number, total: number) =>
      `Showing ${shown} of ${total}. Search to narrow down.`,
  },
  ms: {
    startFailed: "Gagal memulakan pratonton",
    title: "Pratonton sebagai PIC",
    description: "Lihat papan pemuka sama seperti yang dilihat oleh PIC pusat ini. Baca sahaja.",
    search: "Cari jenama, pusat, bandar atau negeri",
    loading: "Memuatkan...",
    brands: "Jenama",
    centres: (count: number) => `${count} pusat`,
    singleCentre: "Pusat tunggal",
    noMatch: "Tiada pusat sepadan.",
    showing: (shown: number, total: number) =>
      `Memaparkan ${shown} daripada ${total}. Cari untuk mengecilkan senarai.`,
  },
})

export function PreviewPicker() {
  const t = useCopy(COPY)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data, isLoading } = useQuery({
    queryKey: ["previewOptions"],
    queryFn: () => getPreviewOptions(),
    enabled: open,
  })

  const start = useMutation({
    mutationFn: (target: Target) => startPreview({ data: target }),
    onSuccess: () => window.location.assign("/dashboard?tab=analytics"),
    onError: (error) => toast.error(error.message || t.startFailed),
  })

  const query = search.trim().toLowerCase()
  const matches = (...values: (string | null)[]) =>
    values.some((value) => (value ?? "").toLowerCase().includes(query))
  const brands = data?.brands.filter((brand) => matches(brand.name)) ?? []
  const centers =
    data?.centers.filter((center) => matches(center.name, center.town, center.state)) ?? []

  const row = "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/50 disabled:opacity-50"

  return (
    <SidebarMenuItem>
      <SidebarMenuButton onClick={() => setOpen(true)}>
        <Eye />
        <span>{t.title}</span>
      </SidebarMenuButton>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex flex-col gap-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t.title}</SheetTitle>
            <SheetDescription>{t.description}</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto border-t">
            {isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">{t.loading}</p>
            ) : (
              <>
                {brands.length > 0 && (
                  <section>
                    <h3 className="px-3 pt-3 pb-1 text-xs font-medium text-muted-foreground">
                      {t.brands}
                    </h3>
                    <ul className="divide-y">
                      {brands.map((brand) => (
                        <li key={brand.id}>
                          <button
                            type="button"
                            className={row}
                            disabled={start.isPending}
                            onClick={() => start.mutate({ companyId: brand.id })}
                          >
                            <span className="truncate">{brand.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                              {t.centres(brand.centers)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                <section>
                  <h3 className="px-3 pt-3 pb-1 text-xs font-medium text-muted-foreground">
                    {t.singleCentre}
                  </h3>
                  {centers.length === 0 ? (
                    <p className="px-3 py-2.5 text-sm text-muted-foreground">{t.noMatch}</p>
                  ) : (
                    <ul className="divide-y">
                      {centers.slice(0, MAX_VISIBLE).map((center) => (
                        <li key={center.id}>
                          <button
                            type="button"
                            className={row}
                            disabled={start.isPending}
                            onClick={() => start.mutate({ centerId: center.id })}
                          >
                            <span className="truncate">{center.name}</span>
                            <span className="shrink-0 truncate text-xs text-muted-foreground">
                              {[center.town, center.state].filter(Boolean).join(", ")}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {centers.length > MAX_VISIBLE && (
                    <p className="px-3 py-2.5 text-xs text-muted-foreground">
                      {t.showing(MAX_VISIBLE, centers.length)}
                    </p>
                  )}
                </section>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </SidebarMenuItem>
  )
}
