import { Link, useNavigate } from "@tanstack/react-router"
import {
  BarChart3,
  Building2,
  LogOut,
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
import { PreviewPicker } from "./preview-picker"

const NAV_ITEMS = [
  { tab: "analytics", icon: BarChart3 },
  { tab: "centers", icon: Building2 },
  { tab: "leads", icon: MessageCircle },
  { tab: "follow-up", icon: PhoneCall },
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
    newLeads: (count: number) => `${count} new leads`,
    followUp: (count: number) => `${count} leads need follow-up`,
    signOut: "Sign out",
  },
  ms: {
    tabs: {
      analytics: "Analitik",
      centers: "Pusat",
      leads: "Permohonan temujanji",
      "follow-up": "Perlu susulan",
      featured: "Slot pilihan",
      sales: "Saluran jualan",
      invitations: "Jemputan",
    },
    newLeads: (count: number) => `${count} permohonan baru`,
    followUp: (count: number) => `${count} permohonan perlu susulan`,
    signOut: "Log keluar",
  },
})

type DashboardSidebarProps = {
  activeTab: DashboardTab
  user: { name: string; email: string }
  role: "pic" | "superadmin" | undefined
  hiddenTabs: DashboardTab[]
  newLeadCount: number
  followUpCount: number
}

export function DashboardSidebar({
  activeTab,
  user,
  role,
  hiddenTabs,
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
          <span className="font-semibold">Dialisis Admin</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {NAV_ITEMS.filter(
              (item) =>
                (!("superadminOnly" in item) || role === "superadmin") &&
                !hiddenTabs.includes(item.tab)
            ).map(({ tab, icon: Icon }) => (
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
            ))}
            {role === "superadmin" && <PreviewPicker />}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
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
