"use client";

import { useState, useTransition } from "react";
import { startCheckout, openBillingPortal, cancelSubscription } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDelete } from "@/components/common/ConfirmDelete";

type Plan = {
  slug: string;
  name: string;
  price_monthly: number;
  price_yearly: number | null;
  max_technicians: number | null;
  stripe_price_id: string | null;
};

type Sub = {
  status: string;
  plan_slug: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  trialing: "Próbaidőszak",
  active: "Aktív",
  past_due: "Fizetési késedelem",
  canceled: "Lemondva",
  suspended: "Felfüggesztve",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  trialing: "secondary",
  active: "default",
  past_due: "destructive",
  canceled: "outline",
  suspended: "destructive",
};

export function SubscriptionClient({
  sub,
  plans,
  role,
  success,
  canceled,
}: {
  sub: Sub | null;
  plans: Plan[];
  role: string;
  success: boolean;
  canceled: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);

  const isOwner = role === "owner";

  function handleCheckout(slug: string) {
    setError(null);
    startTransition(async () => {
      const result = await startCheckout(slug);
      if (result?.error) setError(result.error);
    });
  }

  function handlePortal() {
    setError(null);
    startTransition(async () => {
      const result = await openBillingPortal();
      if (result?.error) setError(result.error);
    });
  }

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelSubscription();
      if (result?.error) setError(result.error);
      else setCancelOpen(false);
    });
  }

  const trialDaysLeft = sub?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Előfizetés</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Jelenlegi csomag és számlázás kezelése.
        </p>
      </div>

      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          Sikeres fizetés — az előfizetés aktiválva.
        </div>
      )}
      {canceled && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
          A fizetési folyamat megszakadt.
        </div>
      )}

      {/* Jelenlegi státusz */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Jelenlegi csomag
            {sub && (
              <Badge variant={STATUS_VARIANTS[sub.status] ?? "outline"}>
                {STATUS_LABELS[sub.status] ?? sub.status}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {sub?.status === "trialing" && trialDaysLeft !== null && (
            <p>
              {trialDaysLeft > 0
                ? `${trialDaysLeft} nap van hátra a próbaidőszakból.`
                : "A próbaidőszak lejárt — válasszon előfizetési csomagot."}
            </p>
          )}
          {sub?.current_period_end && sub.status === "active" && (
            <p className="text-muted-foreground">
              Következő számlázás:{" "}
              {new Date(sub.current_period_end).toLocaleDateString("hu-HU")}
            </p>
          )}
          {sub?.cancel_at_period_end && (
            <p className="text-destructive font-medium">
              Az előfizetés a jelenlegi időszak végén törlődik.
            </p>
          )}
          {sub?.stripe_customer_id && isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePortal}
              disabled={isPending}
            >
              Fizetési mód és számlák kezelése
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Csomagok */}
      <div>
        <h2 className="text-sm font-medium mb-3">Elérhető csomagok</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = sub?.plan_slug === plan.slug;
            return (
              <Card key={plan.slug} className={isCurrent ? "border-primary" : undefined}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {plan.name}
                    {isCurrent && <Badge variant="outline">Jelenlegi</Badge>}
                  </CardTitle>
                  <CardDescription>
                    {plan.price_monthly.toLocaleString("hu-HU")} Ft/hó
                    {plan.price_yearly && (
                      <span className="block text-xs">
                        {plan.price_yearly.toLocaleString("hu-HU")} Ft/év
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">
                    {plan.max_technicians
                      ? `Max ${plan.max_technicians} fő`
                      : "Korlátlan létszám"}
                  </p>
                  {isOwner && !isCurrent && plan.stripe_price_id && (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleCheckout(plan.slug)}
                      disabled={isPending}
                    >
                      Váltás
                    </Button>
                  )}
                  {isOwner && !isCurrent && !plan.stripe_price_id && (
                    <Button size="sm" variant="outline" className="w-full" disabled>
                      Hamarosan
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Lemondás */}
      {isOwner &&
        sub?.stripe_subscription_id &&
        !sub.cancel_at_period_end && (
          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setCancelOpen(true)}
            >
              Előfizetés lemondása
            </Button>
          </div>
        )}

      <ConfirmDelete
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Előfizetés lemondása"
        description="Az előfizetés a jelenlegi számlázási időszak végén szűnik meg. Addig minden funkció elérhető marad."
        confirmLabel="Igen, mondom le"
        onConfirm={handleCancel}
        loading={isPending}
      />
    </div>
  );
}
