import { EmptyState } from "@/components/common/EmptyState";
import { Construction } from "lucide-react";

export default function ComingSoonPage() {
  return (
    <div className="flex flex-1 items-center justify-center py-20">
      <EmptyState
        icon={Construction}
        title="Hamarosan"
        description="Ez a funkció fejlesztés alatt áll."
      />
    </div>
  );
}
