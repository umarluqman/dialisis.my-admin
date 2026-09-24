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
import { InvitationsView } from "@/components/dashboard/invitations-view"
import {
  centersQuery,
  intakeLeadsQuery,
  userRoleQuery,
} from "@/components/dashboard/queries"
import { LEAD_STATUSES, toLeadStatus } from "@/components/intake-lead-list"

const DASHBOARD_TABS = ["analytics", "centers", "leads", "invitations"] as const
export type DashboardTab = (typeof DASHBOARD_TABS)[number]

const searchSchema = z.object({
  tab: z.enum(DASHBOARD_TABS).optional().catch(undefined),
  q: z.string().optional().catch(undefined),
  state: z.string().optional().catch(undefined),
  sector: z.string().optional().catch(undefined),
  featured: z.boolean().optional().catch(undefined),
  sort: z.enum(["asc", "desc"]).optional().catch(undefined),
  status: z.enum(LEAD_STATUSES).optional().catch(undefined),
})

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search) => searchSchema.parse(search),
  component: DashboardPage,
})

const TAB_TITLES: Record<DashboardTab, string> = {
  analytics: "Analytics",
  centers: "Dialysis Centers",
  leads: "Intake Leads",
  invitations: "Invitations",
}

function DashboardPage() {
  const navigate = useNavigate()
  const { tab: requestedTab = "analytics" } = Route.useSearch()
  const { data: session, isPending: sessionPending } = useSession()
  const { data: userRole } = useQuery(userRoleQuery(session?.user?.id))
  const { data: centers } = useQuery({ ...centersQuery, enabled: !!session })
  const { data: leads } = useQuery({ ...intakeLeadsQuery, enabled: !!session })

  const isSuperadmin = userRole?.role === "superadmin"
  const tab =
    requestedTab === "invitations" && !isSuperadmin ? "analytics" : requestedTab
  const newLeadCount =
    leads?.filter((lead) => toLeadStatus(lead.status) === "new").length ?? 0

  const context: Record<DashboardTab, string | null> = {
    analytics: null,
    centers: centers ? `${centers.length} ${centers.length === 1 ? "center" : "centers"}` : null,
    leads: leads ? `${newLeadCount} new · ${leads.length} latest` : null,
    invitations: "Invite a PIC to manage centers",
  }

  if (sessionPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
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
        user={session.user}
        role={userRole?.role}
        newLeadCount={newLeadCount}
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="data-[orientation=vertical]:h-5 data-[orientation=vertical]:self-center" />
          <div className="flex min-w-0 items-baseline gap-3">
            <h1 className="truncate text-base font-semibold">{TAB_TITLES[tab]}</h1>
            {context[tab] && (
              <span className="truncate text-sm text-muted-foreground tabular-nums">
                {context[tab]}
              </span>
            )}
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          {tab === "analytics" && <AnalyticsView />}
          {tab === "centers" && <CentersView isSuperadmin={isSuperadmin} />}
          {tab === "leads" && <LeadsView />}
          {tab === "invitations" && <InvitationsView />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
