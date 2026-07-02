"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";
import { MobileNav } from "./mobile-nav";
import { Menu } from "lucide-react";

const tabHrefs = ["/dashboard", "/my-day", "/jobs", "/calendar"];

const tabItems = tabHrefs
  .map((href) => navItems.find((item) => item.href === href))
  .filter((item): item is (typeof navItems)[number] => Boolean(item));

export function MobileTabbar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <nav
      className={cn(
        "lg:hidden fixed inset-x-0 bottom-0 z-40 flex items-stretch",
        "border-t bg-sidebar text-sidebar-foreground",
        "pb-[env(safe-area-inset-bottom)]"
      )}
      aria-label="Mobil navigáció"
    >
      {tabItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5",
              "min-h-[48px] text-[11px] font-medium transition-colors",
              active
                ? "text-sidebar-primary-foreground bg-sidebar-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon size={20} className="shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={() => setMoreOpen(true)}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5",
          "min-h-[48px] text-[11px] font-medium transition-colors",
          "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
        aria-label="Több menüpont"
      >
        <Menu size={20} className="shrink-0" />
        <span className="truncate">Több</span>
      </button>

      <MobileNav open={moreOpen} onOpenChange={setMoreOpen} hideTrigger />
    </nav>
  );
}
