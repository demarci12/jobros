"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const settingsNav = [
  { href: "/settings/account",      label: "Fiók" },
  { href: "/settings/company",      label: "Cégadatok" },
  { href: "/settings/team",         label: "Csapat" },
  { href: "/settings/services",     label: "Szolgáltatások" },
  { href: "/settings/zones",        label: "Zónák" },
  { href: "/settings/booking",      label: "Foglalás" },
  { href: "/settings/materials",      label: "Anyagok" },
  { href: "/settings/templates",      label: "Sablonok" },
  { href: "/settings/notifications",  label: "Értesítések" },
  { href: "/settings/integrations",   label: "Integrációk" },
  { href: "/settings/billing-list", label: "Számlák" },
  { href: "/settings/subscription", label: "Előfizetés" },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      {/* Bal oldali al-menü */}
      <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto lg:w-44 lg:flex-col">
        {settingsNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Tartalom */}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
