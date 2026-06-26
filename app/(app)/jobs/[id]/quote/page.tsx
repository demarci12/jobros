import { EmptyState } from "@/components/common/EmptyState";
import { FileText } from "lucide-react";

export default function QuotePage() {
  return (
    <EmptyState
      icon={FileText}
      title="Árajánlat"
      description="Tételek, opciók (good/better/best), összeg és státusz. (T-34)"
    />
  );
}
