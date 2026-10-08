import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { z } from "zod"
import { useSession } from "@/lib/auth-client"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AnalyticsView } from "@/components/analytics/analytics-view"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { CentersView } from "@/components/dashboard/centers-view"
import { LeadsView } from "@/components/dashboard/leads-view"
import { FollowUpView } from "@/components/dashboard/follow-up-view"
import { InvitationsView } from "@/components/dashboard/invitations-view"
import { FeaturedView } from "@/components/dashboard/featured-view"
import { SalesView } from "@/components/dashboard/sales-view"
import { LocaleToggle } from "@/components/locale-toggle"
import { PreviewBanner } from "@/components/dashboard/preview-banner"
import {
  centersQuery,
  followUpLeadsQuery,
  intakeLeadsQuery,
  userRoleQuery,
} from "@/components/dashboard/queries"
import { LEAD_STATUSES, toLeadStatus } from "@/components/intake-lead-list"
import { ANALYTICS_PRESETS, CONTACT_KINDS, SOURCE_KEYS } from "@/lib/analytics"
import { defineCopy, useCopy } from "@/lib/i18n"
import { isPlanActive } from "@/lib/plan"

const DASHBOARD_TABS = [
  "analytics",
  "centers",
  "leads",
  "follow-up",
  "featured",
  "sales",
  "invitations",
] as const
export type DashboardTab = (typeof DASHBOARD_TABS)[number]
const SUPERADMIN_TABS: DashboardTab[] = ["featured", "sales", "invitations"]
const PRO_TABS: DashboardTab[] = ["leads", "follow-up"]

const searchSchema = z.object({
  tab: z.enum(DASHBOARD_TABS).optional().catch(undefined),
  q: z.string().optional().catch(undefined),
  state: z.string().optional().catch(undefined),
  sector: z.string().optional().catch(undefined),
  sort: z.enum(["asc", "desc"]).optional().catch(undefined),
  status: z.enum(LEAD_STATUSES).optional().catch(undefined),
  days: z.literal(ANALYTICS_PRESETS).optional().catch(undefined),
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
  town: z.string().optional().catch(undefined),
  contact: z.enum(CONTACT_KINDS).optional().catch(undefined),
  source: z.enum(SOURCE_KEYS).optional().catch(undefined),
})

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search) => searchSchema.parse(search),
  component: DashboardPage,
})

const COPY = defineCopy({
  en: {
    titles: {
      analytics: "Analytics",
      centers: "Dialysis Centers",
      leads: "Intake Leads",
      "follow-up": "Needs follow-up",
      featured: "Featured slots",
      sales: "Sales pipeline",
      invitations: "Invitations",
    } satisfies Record<DashboardTab, string>,
    centerCount: (n: number) => `${n} ${n === 1 ? "center" : "centers"}`,
    previewCenters: (n: number) => `${n} ${n === 1 ? "centre" : "centres"}`,
    leadsContext: (newCount: number, total: number) => `${newCount} new · ${total} latest`,
    followUpContext: (n: number) => `${n} to contact`,
    featuredContext: "One centre per town and per state",
    salesContext: "Contacted → demo → pilot → paid",
    invitationsContext: "Invite a PIC to manage centers",
    loading: "Loading...",
  },
  ms: {
    titles: {
      analytics: "Analitik",
      centers: "Pusat dialisis",
      leads: "Permohonan temujanji",
      "follow-up": "Perlu susulan",
      featured: "Slot pilihan",
      sales: "Saluran jualan",
      invitations: "Jemputan",
    },
    centerCount: (n: number) => `${n} pusat`,
    previewCenters: (n: number) => `${n} pusat`,
    leadsContext: (newCount: number, total: number) => `${newCount} baru · ${total} terkini`,
    followUpContext: (n: number) => `${n} perlu dihubungi`,
    featuredContext: "Satu pusat bagi setiap bandar dan setiap negeri",
    salesContext: "Dihubungi → demo → percubaan → berbayar",
    invitationsContext: "Jemput PIC untuk mengurus pusat",
    loading: "Memuatkan...",
  },
})

function DashboardPage() {
  const navigate = useNavigate()
  const t = useCopy(COPY)
  const { tab: requestedTab = "analytics" } = Route.useSearch()
  const { data: session, isPending: sessionPending } = useSession()
  const { data: userRole } = useQuery(userRoleQuery(session?.user?.id))
  const { data: centers } = useQuery({ ...centersQuery, enabled: !!session })
  const { data: leads } = useQuery({ ...intakeLeadsQuery, enabled: !!session })
  const { data: followUpLeads } = useQuery({ ...followUpLeadsQuery, enabled: !!session })

  const preview = userRole?.preview
  const isSuperadmin = userRole?.role === "superadmin"
  const proLocked = !isSuperadmin && !!centers && !centers.some(isPlanActive)
  const tab =
    (SUPERADMIN_TABS.includes(requestedTab) && !isSuperadmin) ||
    (PRO_TABS.includes(requestedTab) && proLocked)
      ? "analytics"
      : requestedTab
  const newLeadCount =
    leads?.filter(
      (lead) => toLeadStatus(lead.status) === "new" && lead.quality !== "test"
    ).length ?? 0
  const followUpCount = followUpLeads?.length ?? 0

  const context: Record<DashboardTab, string | null> = {
    analytics: null,
    centers: centers ? t.centerCount(centers.length) : null,
    leads: leads ? t.leadsContext(newLeadCount, leads.length) : null,
    "follow-up": followUpLeads ? t.followUpContext(followUpCount) : null,
    featured: t.featuredContext,
    sales: t.salesContext,
    invitations: t.invitationsContext,
  }

  if (sessionPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">{t.loading}</div>
      </div>
    )
  }

  if (!session) {
    navigate({ to: "/auth/sign-in" })
    return null
  }

  return (
    <SidebarProvider>
      <DashboardSidebar
        activeTab={tab}
        user={
          preview
            ? {
                name: preview.label,
                email: t.previewCenters(preview.centers),
              }
            : session.user
        }
        role={userRole?.role}
        proLocked={proLocked}
        newLeadCount={newLeadCount}
        followUpCount={followUpCount}
      />
      <SidebarInset>
        <div className="sticky top-0 z-10">
          {preview && <PreviewBanner label={preview.label} />}
          <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="data-[orientation=vertical]:h-5 data-[orientation=vertical]:self-center" />
            <div className="flex min-w-0 items-baseline gap-3">
              <h1 className="truncate text-base font-semibold">{t.titles[tab]}</h1>
              {context[tab] && (
                <span className="truncate text-sm text-muted-foreground tabular-nums">
                  {context[tab]}
                </span>
              )}
            </div>
            <LocaleToggle className="ml-auto shrink-0" />
          </header>
        </div>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          {tab === "analytics" && <AnalyticsView isSuperadmin={isSuperadmin} />}
          {tab === "centers" && <CentersView isSuperadmin={isSuperadmin} />}
          {tab === "leads" && <LeadsView />}
          {tab === "follow-up" && <FollowUpView />}
          {tab === "featured" && <FeaturedView />}
          {tab === "sales" && <SalesView />}
          {tab === "invitations" && <InvitationsView />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
