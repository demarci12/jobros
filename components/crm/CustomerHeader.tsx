"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone, Mail, Building2, User, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDelete } from "@/components/common/ConfirmDelete";
import { updateCustomer, softDeleteCustomer } from "@/lib/crm/actions";
import { toast } from "sonner";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  tax_number: string | null;
  notes: string | null;
  is_company: boolean;
  deleted_at: string | null;
};

export function CustomerHeader({ customer, canEdit }: { customer: Customer; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateCustomer(customer.id, fd);
      if (result?.error) toast.error(result.error);
      else { toast.success("Ügyfél mentve."); setEditing(false); router.refresh(); }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await softDeleteCustomer(customer.id);
    });
  }

  if (editing) {
    return (
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="name">Név *</Label>
                <Input id="name" name="name" defaultValue={customer.name} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" name="phone" type="tel" defaultValue={customer.phone ?? ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" defaultValue={customer.email ?? ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tax_number">Adószám</Label>
                <Input id="tax_number" name="tax_number" defaultValue={customer.tax_number ?? ""} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">Megjegyzés</Label>
              <Textarea id="notes" name="notes" defaultValue={customer.notes ?? ""} rows={2} />
            </div>
            <input type="hidden" name="is_company" value={customer.is_company ? "true" : "false"} />
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>Mentés</Button>
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>Mégsem</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {customer.is_company ? <Building2 size={20} /> : <User size={20} />}
              <h1 className="text-xl font-semibold">{customer.name}</h1>
              {customer.deleted_at && <Badge variant="destructive" className="text-xs">Archivált</Badge>}
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="flex items-center gap-1 hover:text-foreground">
                  <Phone size={14} />{customer.phone}
                </a>
              )}
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="flex items-center gap-1 hover:text-foreground">
                  <Mail size={14} />{customer.email}
                </a>
              )}
              {customer.tax_number && <span>Adószám: {customer.tax_number}</span>}
            </div>
            {customer.notes && <p className="text-sm text-muted-foreground">{customer.notes}</p>}
          </div>
          {canEdit && (
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
                <Pencil size={16} />
              </Button>
              <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}>
                <Trash2 size={16} />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
      <ConfirmDelete
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Ügyfél archiválása"
        description="Az ügyfél és foglalásai megmaradnak, de a listából eltűnik."
        confirmLabel="Archiválás"
        onConfirm={handleDelete}
        loading={isPending}
      />
    </Card>
  );
}
