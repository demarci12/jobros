import { EmptyState } from "@/components/common/EmptyState";
import { ClipboardList } from "lucide-react";

export default function WorksheetPage() {
  return (
    <EmptyState
      icon={ClipboardList}
      title="Munkalap"
      description="Elvégzett munka, tételek, munkaidő, fotók és aláírás. (T-30)"
    />
  );
}
