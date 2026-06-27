"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, ClipboardList } from "lucide-react";
import { toggleChecklistItem, addChecklistItem, deleteChecklistItem, applyTemplateToJob } from "@/lib/templates/actions";

type ChecklistItem = {
  id: string;
  label: string;
  is_done: boolean;
  done_at: string | null;
  done_by: string | null;
};

type Template = { id: string; name: string };

export function ChecklistPanel({
  jobId,
  initialItems,
  templates,
  canEdit,
}: {
  jobId: string;
  initialItems: ChecklistItem[];
  templates: Template[];
  canEdit: boolean;
}) {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [newLabel, setNewLabel] = useState("");
  const [isPending, startTransition] = useTransition();

  const doneCount = items.filter(i => i.is_done).length;

  function handleToggle(id: string, checked: boolean) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_done: checked } : i));
    startTransition(async () => {
      const res = await toggleChecklistItem(id, checked);
      if (res.error) {
        setItems(prev => prev.map(i => i.id === id ? { ...i, is_done: !checked } : i));
      }
    });
  }

  function handleAdd() {
    const label = newLabel.trim();
    if (!label) return;
    setNewLabel("");
    startTransition(async () => {
      const res = await addChecklistItem(jobId, label);
      if (res.item) {
        setItems(prev => [...prev, res.item as ChecklistItem]);
      }
    });
  }

  function handleDelete(id: string) {
    const prev = items;
    setItems(p => p.filter(i => i.id !== id));
    startTransition(async () => {
      const res = await deleteChecklistItem(id);
      if (res.error) setItems(prev);
    });
  }

  function handleApplyTemplate(templateId: string) {
    startTransition(async () => {
      const res = await applyTemplateToJob(jobId, templateId);
      if (!res.error) {
        // refresh items from server — simplest: reload page
        window.location.reload();
      }
    });
  }

  if (items.length === 0 && !canEdit) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={16} className="text-muted-foreground" />
          <h2 className="font-semibold text-sm">Ellenőrzőlista</h2>
          {items.length > 0 && (
            <Badge variant={doneCount === items.length ? "default" : "secondary"} className="text-xs">
              {doneCount}/{items.length}
            </Badge>
          )}
        </div>
        {canEdit && templates.length > 0 && items.length === 0 && (
          <div className="flex gap-1 flex-wrap justify-end">
            {templates.map(t => (
              <Button key={t.id} variant="outline" size="sm" className="text-xs h-7"
                disabled={isPending}
                onClick={() => handleApplyTemplate(t.id)}>
                + {t.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      {items.length === 0 && canEdit && (
        <p className="text-xs text-muted-foreground">
          Nincs ellenőrzőlista tétel. Adj hozzá egyénileg, vagy alkalmaz egy sablont.
        </p>
      )}

      <ul className="space-y-1.5">
        {items.map(item => (
          <li key={item.id} className="flex items-center gap-2.5 group">
            <Checkbox
              checked={item.is_done}
              disabled={!canEdit || isPending}
              onCheckedChange={(checked) => handleToggle(item.id, checked === true)}
            />
            <span className={`flex-1 text-sm ${item.is_done ? "line-through text-muted-foreground" : ""}`}>
              {item.label}
            </span>
            {item.is_done && item.done_at && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                {new Date(item.done_at).toLocaleDateString("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {canEdit && (
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                disabled={isPending}
                onClick={() => handleDelete(item.id)}>
                <Trash2 size={12} />
              </Button>
            )}
          </li>
        ))}
      </ul>

      {canEdit && (
        <div className="flex gap-2">
          <Input
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="Új tétel hozzáadása…"
            className="h-8 text-sm"
            disabled={isPending}
          />
          <Button size="sm" variant="outline" className="h-8 shrink-0"
            disabled={!newLabel.trim() || isPending}
            onClick={handleAdd}>
            <Plus size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
