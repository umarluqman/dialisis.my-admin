import { Link, useNavigate } from "@tanstack/react-router"
import { BarChart3, Building2, LogOut, MessageCircle, UserPlus } from "lucide-react"
import { signOut } from "@/lib/auth-client"
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

const NAV_ITEMS = [
  { tab: "analytics", label: "Analytics", icon: BarChart3 },
  { tab: "centers", label: "Centers", icon: Building2 },
  { tab: "leads", label: "Intake Leads", icon: MessageCircle },
  { tab: "invitations", label: "Invitations", icon: UserPlus, superadminOnly: true },
] as const

type DashboardSidebarProps = {
  activeTab: DashboardTab
  user: { name: string; email: string }
  role: "pic" | "superadmin" | undefined
  newLeadCount: number
}

export function DashboardSidebar({
  activeTab,
  user,
  role,
  newLeadCount,
}: DashboardSidebarProps) {
  const navigate = useNavigate()
  const { setOpenMobile } = useSidebar()

  const handleSignOut = async () => {
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
              (item) => !("superadminOnly" in item) || role === "superadmin"
            ).map(({ tab, label, icon: Icon }) => (
              <SidebarMenuItem key={tab}>
                <SidebarMenuButton asChild isActive={activeTab === tab}>
                  <Link
                    to="/dashboard"
                    search={{ tab }}
                    onClick={() => setOpenMobile(false)}
                  >
                    <Icon />
                    <span>{label}</span>
                  </Link>
                </SidebarMenuButton>
                {tab === "leads" && newLeadCount > 0 && (
                  <SidebarMenuBadge
                    className="bg-primary text-primary-foreground"
                    aria-label={`${newLeadCount} new leads`}
                  >
                    {newLeadCount}
                  </SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            ))}
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
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
