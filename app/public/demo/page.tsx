import { RequestForm } from "@/components/public/RequestForm";

export const dynamic = "force-static";

const DEMO_SERVICES = [
  { id: "s1", name: "Klíma szerviz / karbantartás" },
  { id: "s2", name: "Klíma telepítés" },
  { id: "s3", name: "Hőszivattyú szerviz" },
  { id: "s4", name: "Gázkazán szerviz" },
  { id: "s5", name: "Felmérés / ajánlatkérés" },
];

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Demo — Klíma Példa Kft.</p>
          <h1 className="text-xl font-semibold">Ajánlatkérő / Foglalás</h1>
          <p className="text-sm text-muted-foreground">Ez az oldal beágyazható a cég weboldalába</p>
        </div>
        <RequestForm companySlug="demo" services={DEMO_SERVICES} />
      </div>
    </div>
  );
}
