"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createQuickCustomer } from "@/lib/crm/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function AddCustomerButton({ canEdit }: { canEdit: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createQuickCustomer(fd);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      if ("id" in result && result.id) {
        setOpen(false);
        router.push(`/customers/${result.id}`);
      }
    });
  }

  if (!canEdit) return null;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} className="mr-1" /> Új ügyfél
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Új ügyfél felvitele</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label>Név *</Label>
              <Input name="name" placeholder="Kovács János" required autoFocus />
            </div>
            <div className="space-y-1">
              <Label>Telefonszám</Label>
              <Input name="phone" type="tel" placeholder="+36 30 123 4567" />
            </div>
            <div className="space-y-1">
              <Label>Cím (utca, hsz) *</Label>
              <Input name="address" placeholder="Kossuth utca 12." required />
            </div>
            <div className="space-y-1">
              <Label>Város</Label>
              <Input name="city" placeholder="Budapest" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? "Mentés…" : "Profil megnyitása"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Mégsem</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
