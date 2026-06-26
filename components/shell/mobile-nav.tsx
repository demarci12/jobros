"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems, settingsItem } from "./nav-items";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useState, useEffect } from "react";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Menü megnyitása"
      >
        <Menu size={20} />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground">
          <SheetHeader className="h-14 border-b px-4 flex flex-row items-center space-y-0">
            <SheetTitle className="text-sidebar-foreground font-semibold">Jobro</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-0.5 p-2 flex-1">
            {navItems.map((item) => (
              <MobileNavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </nav>
          <div className="border-t p-2">
            <MobileNavLink item={settingsItem} pathname={pathname} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function MobileNavLink({
  item,
  pathname,
}: {
  item: { href: string; label: string; icon: React.ElementType };
  pathname: string;
}) {
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground"
      )}
    >
      <Icon size={18} className="shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}
