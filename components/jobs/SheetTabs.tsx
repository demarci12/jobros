"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type JobStatus } from "@/lib/jobs/status-machine";

type Tab = { label: string; href: string; key: string; minStatus?: JobStatus[] };

const TABS: Tab[] = [
  { label: "Áttekintés", href: "", key: "overview" },
  { label: "Munkalap",   href: "/worksheet", key: "worksheet" },
  { label: "Árajánlat", href: "/quote",      key: "quote" },
  { label: "Számla",    href: "/invoice",    key: "invoice", minStatus: ["kesz","szamlazva","fizetve"] },
];

export function SheetTabs({ jobId, status }: { jobId: string; status: JobStatus }) {
  const pathname = usePathname();
  const base = `/jobs/${jobId}`;

  return (
    <div className="flex border-b overflow-x-auto">
      {TABS.map(tab => {
        const href = base + tab.href;
        const isActive = tab.href === ""
          ? pathname === base
          : pathname.startsWith(href);
        const isLocked = tab.minStatus && !tab.minStatus.includes(status);

        return (
          <Link key={tab.key} href={isLocked ? "#" : href}
            aria-disabled={isLocked}
            title={isLocked ? "A munka lezárása után válik aktívvá" : undefined}
            className={`shrink-0 px-3.5 sm:px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
              isActive
                ? "border-foreground font-semibold text-foreground"
                : isLocked
                ? "border-transparent text-muted-foreground/50 cursor-not-allowed"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
            }`}
            onClick={isLocked ? (e) => e.preventDefault() : undefined}>
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
