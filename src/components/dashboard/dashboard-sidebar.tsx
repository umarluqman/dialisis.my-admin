import { Link, useNavigate } from "@tanstack/react-router"
import {
  BarChart3,
  Building2,
  Lock,
  LogOut,
  Menu,
  MessageCircle,
  PhoneCall,
  Star,
  TrendingUp,
  UserPlus,
} from "lucide-react"
import { signOut } from "@/lib/auth-client"
import { stopPreview } from "@/core/functions/preview-functions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type { DashboardTab } from "@/routes/dashboard"
import { defineCopy, useCopy } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { ProBadge } from "@/components/pro-badge"
import { UpgradeToProButton } from "@/components/upgrade-to-pro-button"
import { PreviewPicker } from "./preview-picker"

const NAV_ITEMS = [
  { tab: "analytics", icon: BarChart3 },
  { tab: "centers", icon: Building2 },
  { tab: "leads", icon: MessageCircle, proOnly: true },
  { tab: "follow-up", icon: PhoneCall, proOnly: true },
  { tab: "featured", icon: Star, superadminOnly: true },
  { tab: "sales", icon: TrendingUp, superadminOnly: true },
  { tab: "invitations", icon: UserPlus, superadminOnly: true },
] as const

const COPY = defineCopy({
  en: {
    tabs: {
      analytics: "Analytics",
      centers: "Centers",
      leads: "Intake Leads",
      "follow-up": "Needs follow-up",
      featured: "Featured slots",
      sales: "Sales pipeline",
      invitations: "Invitations",
    } satisfies Record<DashboardTab, string>,
    shortTabs: {
      analytics: "Analytics",
      centers: "Centers",
      leads: "Leads",
      "follow-up": "Follow-up",
    },
    more: "More",
    newLeads: (count: number) => `${count} new leads`,
    followUp: (count: number) => `${count} leads need follow-up`,
    proHint: "Available on the Pro plan",
    signOut: "Sign out",
  },
  ms: {
    tabs: {
      analytics: "Analitik",
      centers: "Pusat",
      leads: "Permohonan temujanji",
      "follow-up": "Lead untuk dihubungi",
      featured: "Slot pilihan",
      sales: "Saluran jualan",
      invitations: "Jemputan",
    },
    shortTabs: {
      analytics: "Analitik",
      centers: "Pusat",
      leads: "Temujanji",
      "follow-up": "Hubungi",
    },
    more: "Lagi",
    newLeads: (count: number) => `${count} permohonan baru`,
    followUp: (count: number) => `${count} lead perlu dihubungi`,
    proHint: "Tersedia dengan pelan Pro",
    signOut: "Log keluar",
  },
})

type DashboardSidebarProps = {
  activeTab: DashboardTab
  user: { name: string; email: string }
  role: "pic" | "superadmin" | undefined
  proLocked: boolean
  upgradeCenterId: string | undefined
  newLeadCount: number
  followUpCount: number
}

export function DashboardSidebar({
  activeTab,
  user,
  role,
  proLocked,
  upgradeCenterId,
  newLeadCount,
  followUpCount,
}: DashboardSidebarProps) {
  const navigate = useNavigate()
  const { setOpenMobile } = useSidebar()
  const t = useCopy(COPY)

  const handleSignOut = async () => {
    await stopPreview()
    await signOut()
    navigate({ to: "/auth/sign-in" })
  }

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="size-6" />
          <span className="font-semibold">DialisisMY Admin</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {NAV_ITEMS.filter(
              (item) => !("superadminOnly" in item) || role === "superadmin"
            ).map(({ tab, icon: Icon, ...item }) =>
              "proOnly" in item && proLocked ? (
                <SidebarMenuItem key={tab}>
                  <SidebarMenuButton
                    disabled
                    title={t.proHint}
                    className="text-muted-foreground"
                  >
                    <Icon />
                    <span>{t.tabs[tab]}</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>
                    <ProBadge title={t.proHint} />
                  </SidebarMenuBadge>
                </SidebarMenuItem>
              ) : (
                <SidebarMenuItem key={tab}>
                  <SidebarMenuButton asChild isActive={activeTab === tab}>
                    <Link
                      to="/dashboard"
                      search={{ tab }}
                      onClick={() => setOpenMobile(false)}
                    >
                      <Icon />
                      <span>{t.tabs[tab]}</span>
                    </Link>
                  </SidebarMenuButton>
                  {tab === "leads" && newLeadCount > 0 && (
                    <SidebarMenuBadge
                      className="bg-primary text-primary-foreground"
                      aria-label={t.newLeads(newLeadCount)}
                    >
                      {newLeadCount}
                    </SidebarMenuBadge>
                  )}
                  {tab === "follow-up" && followUpCount > 0 && (
                    <SidebarMenuBadge
                      className="bg-destructive/10 text-destructive"
                      aria-label={t.followUp(followUpCount)}
                    >
                      {followUpCount}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              )
            )}
            {role === "superadmin" && <PreviewPicker />}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        {proLocked && upgradeCenterId && (
          <UpgradeToProButton centerId={upgradeCenterId} className="w-full" />
        )}
        <div className="flex items-center gap-2 px-1 py-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium">{user.name}</p>
              {role && (
                <Badge variant="secondary" className="shrink-0">
                  {role === "superadmin" ? "Superadmin" : "PIC"}
                </Badge>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <ThemeToggle variant="ghost" size="sm" align="end" />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleSignOut}
            aria-label={t.signOut}
            title={t.signOut}
          >
            <LogOut />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

const MOBILE_TABS = NAV_ITEMS.filter(
  (item): item is Exclude<(typeof NAV_ITEMS)[number], { superadminOnly: true }> =>
    !("superadminOnly" in item)
)

export function MobileTabBar({
  activeTab,
  proLocked,
  newLeadCount,
  followUpCount,
}: Pick<
  DashboardSidebarProps,
  "activeTab" | "proLocked" | "newLeadCount" | "followUpCount"
>) {
  const { setOpenMobile } = useSidebar()
  const t = useCopy(COPY)
  const counts: Partial<Record<DashboardTab, number>> = {
    leads: newLeadCount,
    "follow-up": followUpCount,
  }
  const itemClass =
    "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium"

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {MOBILE_TABS.map(({ tab, icon: Icon, ...item }) => {
        const label = t.shortTabs[tab]
        if ("proOnly" in item && proLocked) {
          return (
            <span
              key={tab}
              title={t.proHint}
              aria-disabled="true"
              className={cn(itemClass, "text-muted-foreground/60")}
            >
              <Icon className="size-5" />
              {label}
              <span className="absolute top-1.5 right-[calc(50%-1.5rem)]">
                <Lock className="size-3" />
              </span>
            </span>
          )
        }
        const count = counts[tab] ?? 0
        return (
          <Link
            key={tab}
            to="/dashboard"
            search={{ tab }}
            aria-current={activeTab === tab ? "page" : undefined}
            className={cn(
              itemClass,
              activeTab === tab ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" />
            {label}
            {count > 0 && (
              <span
                className={cn(
                  "absolute top-1 right-[calc(50%-1.75rem)] min-w-5 rounded-full px-1 text-center text-[10px] leading-5 tabular-nums",
                  tab === "leads"
                    ? "bg-primary text-primary-foreground"
                    : "bg-destructive text-white"
                )}
                aria-label={tab === "leads" ? t.newLeads(count) : t.followUp(count)}
              >
                {count}
              </span>
            )}
          </Link>
        )
      })}
      <button
        type="button"
        onClick={() => setOpenMobile(true)}
        className={cn(itemClass, "text-muted-foreground")}
      >
        <Menu className="size-5" />
        {t.more}
      </button>
    </nav>
  )
}
