"use client";

import { useTransition, useState } from "react";
import { inviteMember, changeRole, deactivateMember, reactivateMember } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDelete } from "@/components/common/ConfirmDelete";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Member = {
  user_id: string;
  role: string;
  is_active: boolean;
  profiles: { full_name: string | null; phone: string | null } | null;
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Tulajdonos",
  dispatcher: "Diszpécser",
  technician: "Szerelő",
  accountant: "Könyvelő",
};

function DeactivateButton({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const fd = new FormData();
    fd.set("userId", userId);
    const result = await deactivateMember(fd);
    setLoading(false);
    setOpen(false);
    if (result?.error) toast.error(result.error);
    else { toast.success("Tag eltávolítva."); onDone(); }
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setOpen(true)}>
        Eltávolítás
      </Button>
      <ConfirmDelete
        open={open}
        onOpenChange={setOpen}
        title="Tag eltávolítása"
        description="Biztosan eltávolítod ezt a tagot? A belépése szünetel."
        confirmLabel="Eltávolítás"
        onConfirm={handleConfirm}
        loading={loading}
      />
    </>
  );
}

export function TeamClient({ members: initialMembers, canManage, currentUserId }: {
  members: Member[];
  canManage: boolean;
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [inviteRole, setInviteRole] = useState("technician");
  const [members, setMembers] = useState(initialMembers);

  function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("role", inviteRole);
    startTransition(async () => {
      const result = await inviteMember(fd);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Meghívó elküldve.");
        (e.target as HTMLFormElement).reset();
      }
    });
  }

  function handleRoleChange(userId: string, role: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("role", role);
      const result = await changeRole(fd);
      if (result?.error) toast.error(result.error);
      else toast.success("Szerepkör frissítve.");
    });
  }

  function handleReactivate(userId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      const result = await reactivateMember(fd);
      if (result?.error) toast.error(result.error);
      else toast.success("Tag visszaállítva.");
    });
  }

  const active = members.filter(m => m.is_active);
  const inactive = members.filter(m => !m.is_active);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Csapattagok</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {active.map(m => (
              <li key={m.user_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 py-3">
                <div>
                  <p className="font-medium text-sm">{m.profiles?.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{m.profiles?.phone || ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && m.user_id !== currentUserId && m.role !== "owner" ? (
                    <>
                      <Select defaultValue={m.role} onValueChange={(v) => v && handleRoleChange(m.user_id, v)} disabled={isPending}>
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dispatcher">Diszpécser</SelectItem>
                          <SelectItem value="technician">Szerelő</SelectItem>
                          <SelectItem value="accountant">Könyvelő</SelectItem>
                        </SelectContent>
                      </Select>
                      <DeactivateButton userId={m.user_id} onDone={() => setMembers(prev => prev.map(p => p.user_id === m.user_id ? { ...p, is_active: false } : p))} />
                    </>
                  ) : (
                    <Badge variant="outline" className="text-xs">{ROLE_LABELS[m.role] ?? m.role}</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {inactive.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base text-muted-foreground">Inaktív tagok</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {inactive.map(m => (
                <li key={m.user_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 py-3">
                  <div>
                    <p className="font-medium text-sm text-muted-foreground">{m.profiles?.full_name || "—"}</p>
                    <Badge variant="secondary" className="text-xs mt-1">Inaktív</Badge>
                  </div>
                  {canManage && (
                    <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleReactivate(m.user_id)}>
                      Visszaállítás
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card>
          <CardHeader><CardTitle className="text-base">Tag meghívása</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="invite-email">E-mail cím</Label>
                <Input id="invite-email" name="email" type="email" required placeholder="kolléga@cég.hu" />
              </div>
              <div className="space-y-1">
                <Label>Szerepkör</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v ?? "technician")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dispatcher">Diszpécser</SelectItem>
                    <SelectItem value="technician">Szerelő</SelectItem>
                    <SelectItem value="accountant">Könyvelő</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={isPending}>Meghívó küldése</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
