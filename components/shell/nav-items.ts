import {
  LayoutDashboard,
  Phone,
  Users,
  Briefcase,
  CalendarDays,
  Inbox,
  Settings,
  Sun,
} from "lucide-react";

export const navItems = [
  { href: "/intake", label: "Telefon-intake", icon: Phone },
  { href: "/dashboard", label: "Irányítópult", icon: LayoutDashboard },
  { href: "/my-day", label: "Mai napom", icon: Sun },
  { href: "/customers", label: "Ügyfelek", icon: Users },
  { href: "/jobs", label: "Munkák", icon: Briefcase },
  { href: "/calendar", label: "Naptár", icon: CalendarDays },
  { href: "/requests", label: "Kérések", icon: Inbox },
] as const;

export const settingsItem = { href: "/settings", label: "Beállítások", icon: Settings };
