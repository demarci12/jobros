import { EmptyState } from "@/components/common/EmptyState";
import { Receipt } from "lucide-react";

export default function InvoicePage() {
  return (
    <EmptyState
      icon={Receipt}
      title="Számla"
      description="Sorszám, NAV státusz, PDF link és fizetési státusz. A fül a kész státusztól aktív. (T-32)"
    />
  );
}
