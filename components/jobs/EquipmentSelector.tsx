"use client";

import { useState, useTransition } from "react";
import { Cpu, Check } from "lucide-react";
import { toast } from "sonner";
import { updateJob } from "@/lib/jobs/actions";

type Equipment = {
  id: string;
  manufacturer: string | null;
  model: string | null;
  kind: string;
  serial_number: string | null;
};

export function EquipmentSelector({
  jobId,
  equipment,
  selectedId,
  canEdit,
}: {
  jobId: string;
  equipment: Equipment[];
  selectedId: string | null;
  canEdit: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(selectedId);
  const [isPending, startTransition] = useTransition();

  if (equipment.length === 0) return null;

  function handleChange(id: string | null) {
    setSelected(id);
    startTransition(async () => {
      const fd = new FormData();
      if (id) fd.set("equipment_id", id);
      const res = await updateJob(jobId, fd);
      if (res?.error) {
        toast.error(res.error);
        setSelected(selected); // revert
      }
    });
  }

  const selectedEq = equipment.find(e => e.id === selected);

  return (
    <div className="flex items-start gap-3 text-sm">
      <Cpu size={15} className="mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        {canEdit ? (
          <select
            value={selected ?? ""}
            onChange={e => handleChange(e.target.value || null)}
            disabled={isPending}
            className="w-full rounded-md border bg-background px-2 py-1 text-sm disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">— Nincs kijelölve —</option>
            {equipment.map(e => (
              <option key={e.id} value={e.id}>
                {[e.manufacturer, e.model].filter(Boolean).join(" ") || e.kind}
                {e.serial_number ? ` · S/N: ${e.serial_number}` : ""}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm">
            {selectedEq
              ? [selectedEq.manufacturer, selectedEq.model].filter(Boolean).join(" ") || selectedEq.kind
              : <span className="text-muted-foreground">Nincs kijelölt berendezés</span>}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">Szervizelt berendezés</p>
      </div>
    </div>
  );
}
