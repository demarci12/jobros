import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RegisterInline } from "@/components/marketing/RegisterInline";
import {
  Wrench, CalendarDays, FileText, Bell, BarChart3,
  CheckCircle2, ArrowRight, Phone, ClipboardList,
  Receipt, Users, Layers, Settings2,
} from "lucide-react";

export default async function RootPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Nav */}
      <header className="border-b sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-base">
            <Wrench size={18} className="text-blue-600" />
            Jobro
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Funkciók</a>
            <a href="#demo" className="hover:text-foreground transition-colors">Demo</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Árak</a>
            <a href="#register" className="hover:text-foreground transition-colors">Regisztráció</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Belépés</Button>
            </Link>
            <a href="#register">
              <Button size="sm">Próba indítása →</Button>
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
              Magyar HVAC szervizcégeknek
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
              Ügyféltől a számlá&shy;ig —{" "}
              <span className="text-blue-600">egy helyen</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              CRM, naptár, munkalap, árajánlat, NAV-számla. Nincs több Excel,
              papír vagy elveszett adatok. A csapat a telefonján, te az irodában.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <a href="#register">
                <Button size="lg" className="gap-2">
                  14 napos ingyenes próba <ArrowRight size={16} />
                </Button>
              </a>
              <a href="#demo">
                <Button size="lg" variant="outline">
                  Demo megnézése
                </Button>
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              Kártya nem szükséges &middot; Bármikor lemondható
            </p>
          </div>

          {/* Stats / highlights */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "2 perc", label: "átlagos hívás-kezelési idő", icon: <Phone size={18} className="text-blue-600" /> },
              { value: "~2 óra", label: "adminisztrációs megtakarítás naponta", icon: <ClipboardList size={18} className="text-green-600" /> },
              { value: "1 gomb", label: "NAV-kompatibilis e-számla kiállítás", icon: <Receipt size={18} className="text-orange-500" /> },
              { value: "0 papír", label: "munkalap, aláírás mobilon", icon: <FileText size={18} className="text-purple-600" /> },
            ].map((s, i) => (
              <div key={i} className="rounded-xl border bg-muted/30 p-5 space-y-2">
                {s.icon}
                <div className="text-2xl font-bold">{s.value}</div>
                <p className="text-xs text-muted-foreground leading-snug">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t bg-muted/20 py-20">
        <div className="max-w-6xl mx-auto px-4 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold">Minden, amire szüksége van</h2>
            <p className="text-muted-foreground">
              Nem általános szoftver — kifejezetten klíma, gáz és hőszivattyú szervizcégekre hangolva.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: <Phone size={20} className="text-blue-600" />,
                title: "Telefon-intake CRM",
                desc: "Becseng a telefon → névre/számra keresel → ügyfélprofil + előzmények + berendezések 1 másodperc alatt. Munka és időpont egy mozdulattal.",
              },
              {
                icon: <CalendarDays size={20} className="text-green-600" />,
                title: "Naptár & foglalás",
                desc: "Diszpécser nézet szerelőnkénti oszlopokkal. Az ügyfél + cím auto kitöltve, a sáv hossza a szolgáltatásból jön. Ütközésvédelem.",
              },
              {
                icon: <ClipboardList size={20} className="text-orange-500" />,
                title: "Digitális munkalap",
                desc: "A szerelő telefonon tölti ki: tételek, fotók, ügyfél-aláírás. Sablonok előre konfigurálhatók szolgáltatástípusonként.",
              },
              {
                icon: <FileText size={20} className="text-purple-600" />,
                title: "Árajánlat-készítő",
                desc: "Előre konfigurált sablonokból vagy soronként. Good/Better/Best opciós ajánlat, PDF export, ügyfél-elfogadás nyomkövetés.",
              },
              {
                icon: <Receipt size={20} className="text-teal-600" />,
                title: "NAV-kompatibilis számla",
                desc: "Munkalap aláírása után egy gomb: Billingo e-számla kiállítás, automatikus NAV-adatszolgáltatás. Idempotens — nem kerül kétszer ki.",
              },
              {
                icon: <Bell size={20} className="text-red-500" />,
                title: "Szerviz emlékeztetők",
                desc: "A berendezés szervizideje közeledik? Az ügyfél automatikusan értesítést kap. Több éves karbantartás, kevesebb elveszett bevétel.",
              },
              {
                icon: <Users size={20} className="text-indigo-600" />,
                title: "Csapatkezelés & szerepkörök",
                desc: "Tulajdonos, diszpécser, szerelő — mindenki csak azt látja, ami rá tartozik. Munkaidő-nyilvántartás, kiszállás-napló.",
              },
              {
                icon: <Layers size={20} className="text-yellow-600" />,
                title: "Raktárkészlet",
                desc: "Anyagmozgások a munkalaphoz kötve. Készletérték, bevételezés, kiadás — minden mozgáshoz napló. Automatikus levonás aláíráskor.",
              },
              {
                icon: <Settings2 size={20} className="text-gray-600" />,
                title: "Integrációk & App Store",
                desc: "Billingo, Google Calendar (hamarosan), SimplePay. Minden connector per-tenant telepíthető, titkok Vault-ban tárolva.",
              },
            ].map((f, i) => (
              <div key={i} className="rounded-xl border bg-background p-5 space-y-3 hover:shadow-sm transition-shadow">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-sm">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo iframe */}
      <section id="demo" className="py-20">
        <div className="max-w-6xl mx-auto px-4 space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold">Beágyazható ajánlatkérő</h2>
            <p className="text-muted-foreground">
              Az ügyfelei a cég weboldalán tölthetik ki — a kérés azonnal megjelenik a rendszerben,
              SMS visszaigazolással. Másoljon be egy sort a weboldalára, és kész.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* iframe */}
            <div className="rounded-2xl border shadow-lg overflow-hidden bg-muted/20">
              <div className="border-b px-4 py-2 flex items-center gap-2 bg-muted/40">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <span className="text-xs text-muted-foreground font-mono ml-2">jobro.hu/public/klima-peldakft/request</span>
              </div>
              <iframe
                src="/public/demo"
                className="w-full h-[560px] border-0"
                title="Demo ajánlatkérő"
              />
            </div>

            {/* Explanation */}
            <div className="space-y-6 pt-2">
              <div className="space-y-4">
                {[
                  {
                    step: "1",
                    title: "Ügyfél kitölti a weboldalán",
                    desc: "A beágyazott form automatikusan megjelenik a Jobro rendszerben Kérések menüpontban.",
                  },
                  {
                    step: "2",
                    title: "Diszpécser visszahívja",
                    desc: "Az ügyfél adata azonnal ott van: név, telefon, cím, igény. Egy kattintás → új munka + időpontfoglalás.",
                  },
                  {
                    step: "3",
                    title: "Automatikus visszaigazolás",
                    desc: "Az ügyfél SMS/email visszaigazolást kap a beérkezésről. Nincs manuális teendő.",
                  },
                  {
                    step: "4",
                    title: "Beágyazás: 1 sor kód",
                    desc: "iframe src=\"jobro.hu/public/[cégszlug]/request\" — bármely weboldalra, mobilon is tökéletes.",
                  },
                ].map((s) => (
                  <div key={s.step} className="flex gap-4">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {s.step}
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-medium text-sm">{s.title}</p>
                      <p className="text-sm text-muted-foreground">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs font-mono text-muted-foreground break-all">
                  {`<iframe src="https://jobro.hu/public/[cegslug]/request" width="100%" height="600" frameborder="0"></iframe>`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-t border-b bg-muted/20 py-14">
        <div className="max-w-5xl mx-auto px-4 space-y-8">
          <p className="text-center text-sm font-medium text-muted-foreground">Pilot cégek visszajelzése</p>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { name: "Kovács B.", role: "Hűtéstechnika Kft.", quote: "A foglalástól a számlázásig minden egy helyen. Napi 2 órát spórolunk adminon." },
              { name: "Tóth M.", role: "KlímaCenter Zrt.", quote: "A szerviz emlékeztetők óta sokkal kevesebb az elvesztett éves karbantartás." },
              { name: "Nagy P.", role: "Hőpumpa Szakszerviz Bt.", quote: "A NAV-integrációval a könyvelőnk is boldog lett. Ajánlom minden HVAC cégnek." },
            ].map((t, i) => (
              <div key={i} className="rounded-xl border bg-background p-5 space-y-3">
                <p className="text-sm text-muted-foreground italic leading-relaxed">&bdquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-2 pt-1">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-none">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-5xl mx-auto px-4 space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">Egyszerű, átlátható árazás</h2>
            <p className="text-muted-foreground">Nincs rejtett díj. Éves fizetéssel 2 hónap ingyen.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                name: "Alap",
                price: "4 900",
                desc: "1–2 szerelős kis cégeknek",
                features: ["2 szerelő", "Korlátlan ügyfél & munka", "Munkalap + e-számla", "Email értesítők", "Beágyazható ajánlatkérő"],
                cta: "Próba indítása",
                highlight: false,
              },
              {
                name: "Pro",
                price: "9 900",
                desc: "3–8 szerelős növekvő cégeknek",
                features: ["8 szerelő", "Smart dispatch", "SMS értesítők", "App Store integrációk", "Raktárkészlet modul", "Árajánlat sablonok"],
                cta: "Próba indítása",
                highlight: true,
              },
              {
                name: "Business",
                price: "19 900",
                desc: "Nagyobb flottának",
                features: ["Korlátlan szerelő", "Minden Pro funkció", "Prioritás support", "Egyedi integráció", "Dedikált onboarding"],
                cta: "Kapcsolatba lépés",
                highlight: false,
              },
            ].map((p, i) => (
              <div
                key={i}
                className={`rounded-2xl border p-6 space-y-5 ${
                  p.highlight
                    ? "border-blue-500 ring-2 ring-blue-500/20 bg-background shadow-lg"
                    : "bg-background"
                }`}
              >
                {p.highlight && (
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">Legnépszerűbb</span>
                )}
                <div>
                  <h3 className="font-bold text-lg">{p.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{p.price}</span>
                  <span className="text-sm text-muted-foreground">Ft / hó</span>
                </div>
                <ul className="space-y-2">
                  {p.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="#register">
                  <Button className="w-full mt-1" variant={p.highlight ? "default" : "outline"} size="sm">
                    {p.cta}
                  </Button>
                </a>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Minden csomag 14 napos ingyenes próbával indul &middot; Kártya nem szükséges
          </p>
        </div>
      </section>

      {/* Register */}
      <section id="register" className="border-t bg-muted/20 py-20">
        <div className="max-w-md mx-auto px-4 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">Kezdje el most</h2>
            <p className="text-muted-foreground">14 nap ingyenes, kártya nem kell, bármikor lemondható.</p>
          </div>
          <RegisterInline />
          <p className="text-center text-sm text-muted-foreground">
            Már van fiókja?{" "}
            <Link href="/login" className="underline hover:text-foreground">
              Belépés
            </Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
            <Wrench size={14} className="text-blue-600" />
            Jobro
          </div>
          <div className="flex gap-5">
            <a href="#features" className="hover:text-foreground">Funkciók</a>
            <a href="#pricing" className="hover:text-foreground">Árak</a>
            <Link href="/login" className="hover:text-foreground">Belépés</Link>
            <a href="mailto:hello@jobro.hu" className="hover:text-foreground">Kapcsolat</a>
          </div>
          <p>© {new Date().getFullYear()} Jobro &middot; Magyar fejlesztés</p>
        </div>
      </footer>

    </div>
  );
}
