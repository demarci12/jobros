"use client";

import { useTransition, useState } from "react";
import { inviteMember, addTechnician, updateTechnicianTrades, changeRole, deactivateMember, reactivateMember } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDelete } from "@/components/common/ConfirmDelete";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { UserPlus, Mail } from "lucide-react";

type Member = {
  user_id: string;
  role: string;
  is_active: boolean;
  trades: string[];
  profiles: { full_name: string | null; phone: string | null } | null;
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Tulajdonos",
  dispatcher: "Diszpécser",
  technician: "Szerelő",
  accountant: "Könyvelő",
};

const TRADES = [
  { value: "klima",       label: "Klíma" },
  { value: "gaz",         label: "Gáz" },
  { value: "hoszivattyu", label: "Hőszivattyú" },
  { value: "futes",       label: "Fűtés" },
  { value: "villany",     label: "Villany" },
  { value: "viz",         label: "Víz" },
  { value: "egyeb",       label: "Egyéb" },
];

const TRADE_COLORS: Record<string, string> = {
  klima: "bg-blue-100 text-blue-700",
  gaz: "bg-orange-100 text-orange-700",
  hoszivattyu: "bg-purple-100 text-purple-700",
  futes: "bg-red-100 text-red-700",
  villany: "bg-yellow-100 text-yellow-700",
  viz: "bg-cyan-100 text-cyan-700",
  egyeb: "bg-gray-100 text-gray-600",
};

function TradeBadges({ trades }: { trades: string[] }) {
  if (!trades?.length) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {trades.map(t => {
        const label = TRADES.find(x => x.value === t)?.label ?? t;
        return (
          <span key={t} className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TRADE_COLORS[t] ?? "bg-gray-100 text-gray-600"}`}>
            {label}
          </span>
        );
      })}
    </div>
  );
}

function TradeEditor({ userId, currentTrades, onDone }: { userId: string; currentTrades: string[]; onDone: () => void }) {
  const [selected, setSelected] = useState<string[]>(currentTrades ?? []);
  const [isPending, startTransition] = useTransition();

  function toggle(v: string) {
    setSelected(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  }

  function save() {
    startTransition(async () => {
      const res = await updateTechnicianTrades(userId, selected);
      if (res?.error) toast.error(res.error);
      else { toast.success("Szakmák frissítve."); onDone(); }
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {TRADES.map(t => (
          <label key={t.value} className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={selected.includes(t.value)}
              onCheckedChange={() => toggle(t.value)}
            />
            <span className="text-sm">{t.label}</span>
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={isPending}>Mentés</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Mégse</Button>
      </div>
    </div>
  );
}

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

type AddMode = "none" | "direct" | "invite";

export function TeamClient({ members: initialMembers, canManage, currentUserId }: {
  members: Member[];
  canManage: boolean;
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [inviteRole, setInviteRole] = useState("technician");
  const [members, setMembers] = useState(initialMembers);
  const [addMode, setAddMode] = useState<AddMode>("none");
  const [editingTradesFor, setEditingTradesFor] = useState<string | null>(null);

  // Direct add form state
  const [directTrades, setDirectTrades] = useState<string[]>(["klima"]);

  function toggleDirectTrade(v: string) {
    setDirectTrades(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  }

  function handleAddDirect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("trades", JSON.stringify(directTrades));
    startTransition(async () => {
      const result = await addTechnician(fd);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Szerelő hozzáadva. Beléphet az e-mail + jelszóval.");
        if ("member" in result && result.member) {
          setMembers(prev => [...prev, result.member as Member]);
        }
        (e.target as HTMLFormElement).reset();
        setDirectTrades(["klima"]);
        setAddMode("none");
      }
    });
  }

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
        setAddMode("none");
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
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Csapattagok</CardTitle>
          {canManage && addMode === "none" && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setAddMode("direct")}>
                <UserPlus size={14} className="mr-1.5" /> Szerelő hozzáadása
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAddMode("invite")}>
                <Mail size={14} className="mr-1.5" /> Meghívó
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {active.map(m => (
              <li key={m.user_id} className="px-6 py-3 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{m.profiles?.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{m.profiles?.phone || ""}</p>
                    {m.role === "technician" && (
                      <div className="mt-1">
                        {editingTradesFor === m.user_id ? (
                          <TradeEditor
                            userId={m.user_id}
                            currentTrades={m.trades ?? []}
                            onDone={() => setEditingTradesFor(null)}
                          />
                        ) : (
                          <button
                            className="text-left"
                            onClick={() => setEditingTradesFor(m.user_id)}
                            title="Kattints a szakmák szerkesztéséhez"
                          >
                            <TradeBadges trades={m.trades ?? []} />
                          </button>
                        )}
                      </div>
                    )}
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
                        <DeactivateButton
                          userId={m.user_id}
                          onDone={() => setMembers(prev => prev.map(p => p.user_id === m.user_id ? { ...p, is_active: false } : p))}
                        />
                      </>
                    ) : (
                      <Badge variant="outline" className="text-xs">{ROLE_LABELS[m.role] ?? m.role}</Badge>
                    )}
                  </div>
                </div>
              </li>
            ))}
            {active.length === 0 && (
              <li className="px-6 py-4 text-sm text-muted-foreground">Még nincs csapattag.</li>
            )}
          </ul>
        </CardContent>
      </Card>

      {/* Szerelő közvetlen hozzáadása */}
      {canManage && addMode === "direct" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Szerelő hozzáadása</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setAddMode("none")}>✕</Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddDirect} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="full_name">Teljes név *</Label>
                  <Input id="full_name" name="full_name" required placeholder="Kovács János" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tech-email">E-mail cím *</Label>
                  <Input id="tech-email" name="email" type="email" required placeholder="kovacs@ceg.hu" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tech-phone">Telefonszám</Label>
                  <Input id="tech-phone" name="phone" type="tel" placeholder="+36 30 123 4567" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tech-password">Jelszó *</Label>
                  <Input id="tech-password" name="password" type="password" required minLength={6} placeholder="legalább 6 karakter" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Szakmák</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TRADES.map(t => (
                    <label key={t.value} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={directTrades.includes(t.value)}
                        onCheckedChange={() => toggleDirectTrade(t.value)}
                      />
                      <span className="text-sm">{t.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>Hozzáadás</Button>
                <Button type="button" variant="ghost" onClick={() => setAddMode("none")}>Mégse</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Email meghívó */}
      {canManage && addMode === "invite" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Tag meghívása e-mailben</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setAddMode("none")}>✕</Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="invite-email">E-mail cím</Label>
                <Input id="invite-email" name="email" type="email" required placeholder="kolléga@cég.hu" />
              </div>
              <div className="space-y-1">
                <Label>Szerepkör</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v ?? "technician")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
    </div>
  );
}
