"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems, settingsItem } from "./nav-items";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PanelLeftClose, PanelLeftOpen, LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-actions";
import { PhoneIntakeDialog } from "@/components/intake/PhoneIntakeDialog";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-14" : "w-56"
      )}
    >
      {/* Logo / brand */}
      <div className="flex h-14 items-center border-b px-3 shrink-0">
        {!collapsed && (
          <span className="font-semibold text-base tracking-tight flex-1">Jobro</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="ml-auto h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
          aria-label={collapsed ? "Menü kinyitása" : "Menü összecsukása"}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </Button>
      </div>

      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-0.5 px-2">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
          ))}
        </nav>
      </ScrollArea>

      <div className="border-t py-2 px-2 shrink-0 space-y-1.5">
        {!collapsed && (
          <div className="w-full">
            <PhoneIntakeDialog fullWidth />
          </div>
        )}
        <NavLink item={settingsItem} collapsed={collapsed} pathname={pathname} />
        <form action={signOut}>
          <button
            type="submit"
            className={cn(
              "w-full flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>Kijelentkezés</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}

function NavLink({
  item,
  collapsed,
  pathname,
}: {
  item: { href: string; label: string; icon: React.ElementType };
  collapsed: boolean;
  pathname: string;
}) {
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;

  const linkEl = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground",
        collapsed && "justify-center px-0"
      )}
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={linkEl} />
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return linkEl;
}
