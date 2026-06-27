import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Wrench, CalendarDays, FileText, MapPin, Bell, BarChart3,
  CheckCircle2, ArrowRight, Zap, Shield, Smartphone,
} from "lucide-react";

export default async function RootPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Wrench size={20} className="text-blue-600" />
            Jobro
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Funkciók</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Árak</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Belépés</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">14 napos próba →</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center space-y-6">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full border border-blue-200">
          <Zap size={12} /> Magyar HVAC cégeknek tervezve
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
          Klíma & hőpumpa szervizcégek{" "}
          <span className="text-blue-600">okosabb irányítója</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Ügyféltől a számláig — egy helyen. CRM, foglalás, munkalap, NAV-számla.
          Nincs több Excel, papír vagy elveszett adatok.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/register">
            <Button size="lg" className="w-full sm:w-auto gap-2">
              Ingyenes próba indítása <ArrowRight size={16} />
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground">14 nap ingyenes &middot; Kártya nem szükséges &middot; Bármikor lemondható</p>
        </div>

        {/* App preview placeholder */}
        <div className="mt-10 rounded-2xl border shadow-xl bg-muted/30 h-80 sm:h-96 flex items-center justify-center">
          <div className="text-center space-y-2 text-muted-foreground">
            <CalendarDays size={40} className="mx-auto opacity-30" />
            <p className="text-sm">Diszpécser naptár — drag & drop ütemezés</p>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-y bg-muted/30 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-3">
          <p className="text-sm text-muted-foreground font-medium">Pilot cégek véleménye</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { name: "Kovács B.", role: "Hűtéstechnika Kft.", quote: "A foglalástól a számlázásig minden egy helyen. Napi 2 órát spórolunk adminon." },
              { name: "Tóth M.", role: "KlímaCenter Zrt.", quote: "A szerviz emlékeztetők óta sokkal kevesebb az elvesztett éves karbantartás." },
              { name: "Nagy P.", role: "Hőpumpa Szakszerviz Bt.", quote: "A NAV-integrációval a könyvelőnk is boldog lett. Ajánlom minden HVAC cégnek." },
            ].map((t, i) => (
              <div key={i} className="bg-background rounded-xl border p-4 text-left space-y-2">
                <p className="text-sm italic text-muted-foreground">&bdquo;{t.quote}&rdquo;</p>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-20 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold">Minden, amire egy HVAC cégnek szüksége van</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Nem általános szoftver — kifejezetten klíma, gáz és hőszivattyú cégekre hangolva.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: <Wrench className="text-blue-600" size={22} />,
              title: "Telefon-intake CRM",
              desc: "Becseng a telefon → névre/számra keresel → ügyfélprofil 1 másodperc alatt. Az előzmények, berendezések, szerviznapló mind ott.",
            },
            {
              icon: <CalendarDays className="text-green-600" size={22} />,
              title: "Drag & drop naptár",
              desc: "Diszpécser nézet szerelőnkénti oszlopokkal. Foglalásnál az ügyfél + cím automatikusan kitöltve, a sáv hossza a szolgáltatásból jön.",
            },
            {
              icon: <FileText className="text-orange-600" size={22} />,
              title: "Munkalap & NAV-számla",
              desc: "A szerelő a telefonján tölti ki a munkalapot + aláírás. Egy gombnyomás: NAV-kompatibilis e-számla Billingóból, automatikusan.",
            },
            {
              icon: <Bell className="text-purple-600" size={22} />,
              title: "Automatikus emlékeztetők",
              desc: "A berendezés szervizideje közeledik? Az ügyfél automatikusan SMS-t kap 14/7/1 nappal előre. Több bevétel, kevesebb elfelejtett szerviz.",
            },
            {
              icon: <MapPin className="text-red-600" size={22} />,
              title: "Térkép & zóna",
              desc: "Az aznapi kiszállások térképen, útvonaloptimalizálás zónák szerint. Kevesebb kilométer, több munka naponta.",
            },
            {
              icon: <BarChart3 className="text-teal-600" size={22} />,
              title: "Dashboard & export",
              desc: "Havi bevétel, kintlévőség, számlázandó munkák — egy képernyőn. NAV-os CSV export a könyvelőnek egy kattintással.",
            },
          ].map((f, i) => (
            <div key={i} className="rounded-xl border p-5 space-y-3 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                {f.icon}
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-muted/30 border-y py-20">
        <div className="max-w-4xl mx-auto px-4 space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold">Egyszerű, átlátható árazás</h2>
            <p className="text-muted-foreground">Nincs rejtett díj. Bármikor lemondható.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                name: "Alap",
                price: "4 900",
                period: "/ hó",
                desc: "1–2 szerelős kis cégeknek",
                features: ["2 szerelő", "Korlátlan ügyfél", "Munkalap + e-számla", "Email értesítők"],
                cta: "Kipróbálom",
                highlight: false,
              },
              {
                name: "Pro",
                price: "9 900",
                period: "/ hó",
                desc: "3–8 szerelős növekvő cégeknek",
                features: ["8 szerelő", "Smart dispatch", "SMS értesítők", "App Store integrációk", "Térkép nézet"],
                cta: "Kipróbálom",
                highlight: true,
              },
              {
                name: "Business",
                price: "19 900",
                period: "/ hó",
                desc: "Nagyobb flottának",
                features: ["Korlátlan szerelő", "Minden Pro funkció", "Prioritás support", "Egyedi integráció"],
                cta: "Kapcsolatba lép",
                highlight: false,
              },
            ].map((p, i) => (
              <div key={i} className={`rounded-2xl border p-6 space-y-5 ${p.highlight ? "border-blue-500 shadow-lg bg-background ring-2 ring-blue-500/20" : "bg-background"}`}>
                {p.highlight && (
                  <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full w-fit">Legnépszerűbb</div>
                )}
                <div>
                  <h3 className="font-bold text-lg">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{p.price}</span>
                  <span className="text-sm text-muted-foreground">Ft{p.period}</span>
                </div>
                <ul className="space-y-2">
                  {p.features.map((f, fi) => (
                    <li key={fi} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button className="w-full" variant={p.highlight ? "default" : "outline"}>
                    {p.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Minden csomag 14 napos ingyenes próbával indul · Éves fizetéssel 2 hónap ingyen
          </p>
        </div>
      </section>

      {/* Mobile CTA */}
      <section className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center">
            <Smartphone size={28} className="text-white" />
          </div>
        </div>
        <h2 className="text-3xl font-bold">Szerelőid a telefonon, te az irodában</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          A szerelő telefon-böngészőben tölti ki a munkalapot, veszi fel az aláírást és a fotókat.
          Nincs papír, nincs visszagépelés.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/register">
            <Button size="lg" className="gap-2">
              Ingyenes próba — 14 nap <ArrowRight size={16} />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-muted/20">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Wrench size={14} className="text-blue-600" />
            Jobro
          </div>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-foreground">Belépés</Link>
            <Link href="/register" className="hover:text-foreground">Regisztráció</Link>
            <a href="mailto:hello@jobro.hu" className="hover:text-foreground">Kapcsolat</a>
          </div>
          <p>© {new Date().getFullYear()} Jobro · Magyar fejlesztés</p>
        </div>
      </footer>
    </div>
  );
}
