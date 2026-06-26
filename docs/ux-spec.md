# Jobro HVAC — UX specifikáció (képernyőnként)

**Verzió:** 1.0 · Kiegészíti: rendszerterv v1.1 + build-plan. Minden képernyő a megfelelő ticket(ek)hez kötve.

## Alapelvek (a 3 persona × terepi valóság)
- **Technikus (mobil, gyenge térerő):** glanceable, nagy tap-célok, minimális gépelés, a *következő művelet* mindig nyilvánvaló. Offline is működik. Egy kéz, kesztyű, napsütés.
- **Diszpécser (Anita, desktop):** sűrűség — lásson mindent egyszerre. Ki hol van, mi akadt el, mi nincs még kiszámlázva. Drag-drop.
- **Tulajdonos (Gábor/Tamás):** pénz előre. A dashboard a kivételeket és a bevételt mutatja, nem mindent.

**Univerzális szabály:** minden lista sor egy *állapotot* és egy *következő műveletet* sugall. Ne legyen "néma" adat — minden szám mellett ott a "mi ezzel a teendő".

---

## 1. Dashboard — `app/(app)/dashboard` (T-82)
**Cél:** a tulajdonos 5 másodperc alatt lássa, jól megy-e a hét, és mi akadt el.

**Fő adatok (prioritás szerint, fentről le):**
1. **Bevétel sáv** — e heti / e havi kiszámlázott + befolyt összeg, az előző időszakhoz képest (↑/↓). HUF, nagy szám.
2. **Pénz, ami áll** — kiszámlázott de nem fizetett (`szamlazva` státusz összege) → "X Ft behajtásra vár" + lista link.
3. **Kész, de nincs számlázva** — `kesz` jobok száma → ez a leggyakoribb pénzszivárgás. Kattintható.
4. **Mai / holnapi beosztás** — hány job, melyik technikusnál, van-e be nem osztott.
5. **Kivétel-widgetek:** kész-de-nem-számlázott munkák, közelgő kötelező szervizek (≤14 nap), olvasatlan ajánlatkérések.

**Használhatóság:**
- Ne legyen 6-nál több kártya. Minden kártya egy kérdésre felel: "kell-e ma cselekednem?".
- A "kész de nem számlázva" és a "nem fizetett" a két legértékesebb widget — ezek hozzák vissza a havidíjat azonnal.
- Mobilon a dashboard = csak a bevétel + a 3 kivétel-szám, egymás alatt.

---

## 2. Job lista — `app/(app)/jobs` (T-22)
**Cél:** a diszpécser gyorsan megtalálja és státusz szerint kezelje a munkákat.

**Oszlopok (asztali, sűrű tábla):**
| Oszlop | Miért |
|--------|-------|
| Job szám + cím | azonosítás |
| Ügyfél + helyszín (város) | "hova megyünk" |
| **Státusz badge** (színes, magyar) | a legfontosabb vizuális jel |
| Felelős technikus (avatar) | ki csinálja |
| Tervezett időpont | mikor |
| Összeg (ajánlat/munkalap) | mennyit ér |
| Utolsó esemény ideje | "elakadt-e" (3 napja ÚJ → piros) |

**Szűrők (felül, mindig látszó):** státusz (multi), technikus, dátumtartomány, ügyfél kereső. Default nézet: "aktív" (minden, ami nem `fizetve`/`elutasitva`/`lemondva`).

**Használhatóság:**
- **Színkód a státuszra** = a fő navigációs jel. Az "elakadt" jobok (régóta nem mozdult státusz) kapjanak vizuális figyelmeztetést (pl. tompított piros pötty).
- Sorra kattintás → job detail. Hover-en gyors műveletek (státuszváltás, technikus).
- Mobilon: kártyák, nem tábla. Egy kártyán: ügyfél, város, státusz, idő, technikus — a többi a detailben.

---

## 3. Job detail — `app/(app)/jobs/[id]` (T-22) ⭐ A LEGFONTOSABB KÉPERNYŐ
**Cél:** egy job teljes valósága egy helyen, **Excel-fül-szerű lapozóval**. A munkalap, árajánlat és számla **kizárólag itt, a jobon belül** él — nincs külön felső menüpontjuk.

**Felső sáv (mindig látszó, sticky):**
- Job szám + ügyfél név + helyszín cím (térkép link / navigáció gomb).
- **StatusPipeline** — vizuális magyar folyam, csak az engedett következő státusz kattintható (FR-3a). Ez a képernyő gerince.
- Felelős technikus + tervezett időpont (szerkeszthető).

**Excel-fül-szerű lapozó (sheet tabs, a felső sáv alatt):**
A fülek a job állapotához igazodnak (inaktív/halvány, amíg nem releváns), pont mint egy Excel-munkafüzet lapjai:
1. **Áttekintés** — ügyfél + elérhetőség (1-katt hívás), berendezés(ek) (típus, gyári szám, garancia, *köv. szerviz*, szervizmúlt = lock-in adat), foglalások (felmérés/munka), idővonal.
2. **Munkalap** — elvégzett munka, tételek (katalógusból), munkaidő, fotók, aláírás. (T-30)
3. **Árajánlat** — tételek, opciók (good/better/best), összeg, státusz (elküldve/elfogadva). (T-34)
4. **Számla** — sorszám, **NAV státusz** (✓/⏳/✗), PDF link, fizetve-e; a kiállítás innen indul. (T-32) A fül a `kesz` státustól aktív.
- (opcionálisan **Fotók** és **Idő** külön fül, ha a munkalap fül zsúfolt.)

**Használhatóság:**
- A fülek sorrendje a munka életciklusát követi (Áttekintés → Munkalap → Árajánlat → Számla); az aktív fül a job aktuális fázisához ugrik alapból.
- Az aktív fülön a következő logikus művelet a leghangsúlyosabb gomb (pl. Munkalap fülön `kesz` után a Számla fül villan be "Számla kiállítása" CTA-val).
- A NAV státusz sose néma: ⏳ pending / ✓ done / ✗ error + olvasható hibaszöveg, "újra" gombbal.
- Inaktív fül (pl. Számla a munka előtt) látszik, de halvány + tooltip ("a munka lezárása után").

---

## 4. Job létrehozás — `app/(app)/jobs/new` (T-23)
**Cél:** 30 másodperc alatt felvenni egy munkát, akár telefon közben.

**Mezők (sorrendben, a legtöbb opcionális induláskor):**
1. Ügyfél (kereső + "új ügyfél" inline) → kiválasztás után a helyszínei megjelennek.
2. Helyszín (a kiválasztott ügyfélé, vagy új).
3. Job típus (klíma szerviz / gáz / telepítés…) → ha sablon tartozik hozzá, felajánlja.
4. Felelős technikus + tervezett időpont (opcionális — maradhat be nem osztott).
5. Rövid leírás.

**Használhatóság:**
- Minimum a sikeres létrehozáshoz: ügyfél + helyszín + típus. Minden más később.
- A "be nem osztott" job legyen érvényes állapot — a diszpécser a naptárban osztja be utólag.
- Telefon-közbeni felvételhez: az ügyfélkereső legyen nagyon gyors (név/telefon).

---

## 5. Diszpécser naptár — `app/(app)/calendar` (T-40, T-41)
**Cél:** Anita lássa, ki ér rá, mi van beosztva, és drag-drop-pal rendezzen.

**Elrendezés:**
- **Oszlopok = technikusok**, sorok = idő (nap/hét nézet). Job blokkok színe = státusz vagy job típus.
- Egy job blokkon: ügyfél, város, időtartam, kis státusz pötty.
- **Bal sáv: "be nem osztott" jobok** — innen húzhatók a naptárra.
- **Térkép nézet (T-41):** a nap jobjai pinekként; "javasolt sorrend" gomb (nearest-neighbor).

**Használhatóság:**
- Drag-drop = az elsődleges interakció. Ütközésnél (két job egy időben egy technikusnál) vizuális figyelmeztetés.
- A be nem osztott jobok mindig szem előtt — ez a diszpécser napi "inbox"-a.
- Hét nézet a tervezéshez, nap nézet a "ma" operatív vezetéshez, térkép az útvonalhoz.

---

## 6. Ügyfél lista + detail — `app/(app)/customers` (T-12)
**Lista oszlopok:** név, magán/céges jel, telefon, helyszínek száma, utolsó job dátuma, élettartam-érték (összes számlázott — opcionális). Kereső név/telefon szerint.

**Customer detail:**
- Fej: név, elérhetőség (hívás/email egy kattintás), céges adatok (adószám).
- **Helyszínek** kártyák — mindegyik alatt a berendezések.
- **Berendezések** — típus, gyári szám, köv. szerviz, garancia.
- **Job előzmény** — időrendben, státusszal és összeggel.
- **Pénzügyi összegzés** — összes számlázott / kintlévőség (opcionális).

**Használhatóság:**
- A customer detail a "kapcsolat memóriája" — amikor az ügyfél telefonál, a diszpécser itt mindent lát. A berendezés-előzmény és a köv. szerviz dátum a legértékesebb.
- "Új job ennek az ügyfélnek" gomb mindig elérhető a detailről.

---

## 7. Technikus mobil — "Ma" — `app/m/today` (T-50) ⭐ A MÁSODIK LEGFONTOSABB
**Cél:** a szerelő reggel ránéz, és tudja a napját. Gyenge térerőn is.

**Fő adatok (kártyánként egy job, időrendben):**
1. **Időpont** (nagy) + ügyfél név.
2. **Cím** + egy gombos **navigáció** (Google/Waze) + **hívás** gomb.
3. Job típus + rövid leírás.
4. Státusz (nagy badge) + a **következő művelet gomb** (pl. "Megérkeztem" → `folyamatban`).
5. Berendezés rövid infó (típus + köv. szerviz), ha releváns.

**Használhatóság:**
- Egy kéz, nagy gombok. A kártya teteje = "mikor/hova", alja = "mit nyomjak".
- Offline: a mai lista cache-elt, a műveletek queue-ba mennek (FR-5a). Vizuális jel, ha "szinkronra vár".
- A sorrend a tervezett időpont; a "most aktív" job kiemelve.

---

## 8. Munkalap fül (reszponzív web) — `jobs/[id]/worksheet` (T-30, T-43, T-44)
**Cél:** a helyszínen rögzíteni mindent, minimális gépeléssel — a szerelő telefon-böngészőből, a job-detail **Munkalap fülén**. (Dedikált offline PWA = Phase 2.)

**Szakaszok (fentről le, a munka menete szerint):**
1. **Fejléc:** ügyfél, cím, berendezés (+ előzmény "korábbi hibák" kinyitható).
2. **Időmérés (T-44):** nagy Start/Stop gomb — clock-in a helyszínen.
3. **Ellenőrzőlista (T-45):** kipipálható tételek (ha sablon).
4. **Elvégzett munka:** szabad szöveg (hangbevitel-barát) + munkaidő.
5. **Tételek:** anyag + munkadíj. Katalógusból gyors hozzáadás (gépelés helyett tap). Összeg élőben.
6. **Fotók:** előtte/utána, kamera közvetlen (web file input, telefonon kamera).
7. **Aláírás:** ügyfél + technikus (canvas, touch, T-43).
8. **Lezárás:** "Munka kész" → `kesz` státusz (ezzel a Számla fül aktívvá válik).

**Használhatóság:**
- Reszponzív: telefon-böngészőből egy kézzel használható; a leggyakoribb anyagtételek elöl, tapelve.
- Az aláírás és a "kész" a flow vége — a képernyő alján, hüvelykujjal elérhető.
- Fotó: a "muszáj-e fotó" a job típustól függhet (telepítésnél igen).
- **Online MVP:** stabil térerő kell a mentéshez; az offline-first (adatvesztés nélkül térerő nélkül) Phase 2.

---

## 9. Árajánlat szerkesztő — `components/quotes/QuoteEditor` (T-33)
**Cél:** gyors, meggyőző ajánlat, opciókkal (close-rate).

**Adatok:**
- Tételsorok (leírás, mennyiség, egységár, ÁFA), élő végösszeg.
- **Opcionális tételek** jelölése (ügyfél választhatja).
- **Csomagok (good/better/best)** — option_group szerint csoportosítva, egymás mellett.
- Érvényesség dátuma, jegyzet.
- (Phase 2) Részletfizetés havi bontás megjelenítése.

**Használhatóság:**
- A csomag-nézet (jó/jobb/legjobb) vizuálisan oszloposan — az ügyfél a középsőt választja leggyakrabban (anchoring).
- "Küldés" után az ügyfél a publikus oldalon fogad el → automatikus `arajanlat` → `utemezve`.

---

## 10. Számla-lista (könyvelői) — `app/(app)/settings/billing-list` (T-63 köré)
> **Csak olvasó + export** áttekintő nézet a könyvelőnek/ownernek. Számlát itt NEM lehet kiállítani — az kizárólag a jobon belüli **Számla fülön** (3. szakasz) történik.

**Lista oszlopok:** számla szám, ügyfél, összeg, **NAV státusz** (✓/⏳/✗), fizetve-e, kiállítás dátuma, PDF, ugrás a jobra.
**Használhatóság:** a NAV-hibás számlák felül/kiemelve (az "újraküldés" a jobra navigál); "nem fizetett" szűrő a behajtáshoz; dátumtartomány CSV export a könyvelőnek.

---

## 11. Beérkező ajánlatkérések — `app/(app)/requests` (T-81)
**Lista:** név, telefon, kért szolgáltatás, üzenet, beérkezés ideje, státusz (new/contacted/converted/spam).
**Fő művelet:** "Job létrehozása" — egy kattintással customer + site + job. A `new` kérések kiemelve (ez bevétel-forrás).
**Használhatóság:** ez a tulajdonos napi "inbox"-a a dashboard mellett. Gyors spam-jelölés.

---

## 12. Publikus ajánlatkérő — `app/public/[slug]/request` (T-80)
**Cél:** a lakossági ügyfél 1 percben kérjen ajánlatot a cég oldaláról.
**Mezők (minimális):** név, telefon, cím, szolgáltatás típus, rövid üzenet. Opcionális: fotó a problémáról.
**Használhatóság:** a lehető legkevesebb mező. Mobilbarát. Beküldés után visszajelzés: "Hamarosan keresünk." A telefon a kötelező mező (a cég visszahív).

---

## 13. Publikus aláírás — `app/public/sign/[token]` (T-53)
**Cél:** ha az ügyfél a saját eszközén ír alá (vagy utólag).
**Adatok:** a munkalap összefoglalója (mit végeztek, tételek, összeg) + aláírás mező.
**Használhatóság:** rövid életű, biztonságos token. Csak az összefoglaló + aláírás — semmi navigáció.

---

## 14. Beállítások hub — `app/(app)/settings` ⭐ (T-09, T-20, T-21, T-54)
Bal oldali al-menü, **minden funkcióhoz beállítás** (FR-13). Szuper reszponzív (mobilon az al-menü összecsukódik).
**Szekciók:**
- **Saját adat (account):** név, telefon, jelszó, nyelv.
- **Cég (company):** név, adószám, cím, logó (a PDF-ekre), publikus slug, ÁFA-alap.
- **Csapat (team):** tagok listája, szerepkör váltás (owner/dispatcher/technician/accountant), **eltávolítás**, email-meghívás.
- **Szolgáltatások (services):** lista + szerkesztő (időtartam, felmérés-e, ár, ÁFA, szín). CRUD.
- **Szervizzónák (zones):** szerelőnként bázispont (térképen) + radius. CRUD.
- **Foglalás (booking):** mód-kapcsoló (smart/manual) + munkaidő-sávok + auto-fill viselkedés.
- **Értesítések (notifications):** eseményenként (on-my-way, ajánlat kész, számla, emlékeztető) ki/be + csatorna (SMS/email) + sablon-szerkesztő.
- **Integrációk (integrations):** App Store — connectorok telepítése (Billingo/Számlázz, naptár, fizetés, üzenet).
- **Előfizetés (subscription):** plan, fizetőeszköz, számlák, upgrade/downgrade, **lemondás**, trial-visszaszámláló.
- **Számlák (billing-list):** könyvelői olvasó + export nézet.

**Használhatóság:** minden szekció önállóan menthető; a veszélyes műveletek (tag eltávolítás, előfizetés lemondás) megerősítéssel.

---

## Globális UX elemek
- **Navigáció:** összecsukható bal sáv (desktop) / hamburger (mobil) — Dashboard, Naptár, Munkák, Ügyfelek, Kérések, Mai napom, Beállítások. Minden szerep ugyanazt a reszponzív appot használja (a szerelő a böngészőből).
- **Teljes CRUD mindenhol (FR-12):** minden listán/oldalon add/edit/töröl, közös ConfirmDelete + UndoToast mintával; törlés = soft delete + megerősítés + undo (számla kivétel).
- **Szuper reszponzív (NFR-6):** minden képernyő mobil/tablet/desktopon; kis kijelzőn a táblázatok kártyás nézetre váltanak.
- **Üres állapotok:** minden lista üres állapota mondja meg a következő lépést ("Még nincs munka — hozz létre egyet").
- **Értesítés-visszajelzés:** ha kiment egy SMS/email, a job idővonalán látsszon ("On-my-way elküldve 14:32").
- **Mindig látszó "következő művelet":** a teljes app vezérelve azon, hogy a státusz alapján mi a logikus következő gomb.
- **Magyar, szakzsargonban:** munkalap, árajánlat, felmérés, kiszállás — a szakma nyelvén, ne fordított angol.

---

## Kiegészítő képernyő-részletek (CRM-flow + foglalás)

> A központi képernyő a **CRM ügyfélprofil**, a belépő a **telefon-intake**. A foglalás az ügyfélprofilból indul.

### A. Telefon-intake — `app/(app)/intake` ⭐ A LEGGYAKRABBAN HASZNÁLT KÉPERNYŐ
**Cél:** hívás közben 5 mp alatt azonosítani a hívót.
**Adatok/elemek:** egyetlen nagy kereső (név/telefon) → élő találatok. Találat → profil nyílik. Nincs találat → **"Új ügyfél" gomb** (név + cím, 2 mező) → profil.
**Használhatóság:** ez a "telefon mellett" képernyő — minimális kattintás, a kereső fókuszban indul. A leggyakoribb művelet (létező ügyfél megnyitása) egy gépelés + egy kattintás.

### B. Ügyfélprofil — `app/(app)/customers/[id]` ⭐ A KÖZPONTI KÉPERNYŐ
**Cél:** minden az ügyfélről egy helyen, innen indul a foglalás.
**Adatok (prioritás szerint):**
1. Fej: név, telefon (1 kattintás hívás), email; magán/céges.
2. **Címek (sites)** — több is; mindegyiknél a "Foglalás erre a címre" lehetőség.
3. **Foglalások (appointments)** — időrendben, státusszal (felmérés/munka), módosítható.
4. Berendezések cím alatt (típus, köv. szerviz).
5. Korábbi munkák + pénzügyi összegzés.
**Fő gomb:** **"Új időpont"** (kiemelt) → foglaló drop-up (lásd C).
**Használhatóság:** a profil a "kapcsolat memóriája". A foglalások és a címek a két legfontosabb blokk — a módosítás (meglévő foglalás) és az új foglalás egy képernyőről elérhető.

### C. Foglaló — drop-up az ügyfélprofilon ⭐
**Cél:** a foglalás a lehető legegyszerűbb — 3 lépés, a háttér-logika rejtve.
**Lépések:**
1. **Szolgáltatás** (a services-ből) — ebből jön az időtartam és hogy kell-e felmérés.
2. **Nap** — naptár, a foglaltság szinkronban látszik.
3. **Javasolt sávok** — a rendszer feldobja (legjobb felül): *idő + szerelő + becsült odajutás*. Egy kattintás = foglalás.
**Felmérés-ág:** ha a szolgáltatás felmérést igényel, a foglaló jelzi: "Először felmérés (X perc)". A teljes munka majd az ajánlat elfogadásakor kerül foglalásra.
**Auto-fill / max segítség (FR-14):** ügyfél + cím a profilból ELŐTÖLTVE; a sáv-hossz a szolgáltatásból; a rendszer felajánlja a következő szabad napot/sávot és a zóna-szerelőt; emlékszik az ügyfél utoljára használt szolgáltatására.
**Használhatóság:** a felhasználó NEM lát H3-at, zónát, buffert — ideális esetben csak egy sávot választ, minden más elő van töltve. A javaslat indokolva ("Kovács, 12 perc út").

### D. Diszpécser naptár — `app/(app)/calendar`
**Forrás:** az **appointments**. Szerelő-oszlopok, felmérés/munka színkód, drag-drop, nap/hét/hó/térkép.
**Elemek:** a smart módban az utazási buffer vizuálisan a blokk előtt. (Élő GPS-térkép = Phase 2.)

### E. Beállítások → Szolgáltatások — `app/(app)/settings/services`
**Adatok:** szolgáltatás lista (név, időtartam, felmérés-e, ár, ÁFA, szín). CRUD.
**Használhatóság:** ez vezérli a foglalást — érthető legyen, hogy az "időtartam" = a naptár-sáv hossza, a "felmérés szükséges" = kétlépcsős foglalás.

### F. Beállítások → Szervizzónák — `app/(app)/settings/zones`
**Adatok:** szerelőnként bázispont (térképen kijelölve) + kiszállási radius (km). Opció: lefedett területek.
**Használhatóság:** térképes kijelölés, nem koordináta-beírás. Ez vezérli, melyik szerelőt ajánlja a rendszer.

### G. GPS megosztás — **Phase 2** (mobil appra épül)
A web-first verzióban nincs. Később: a szerelő nézetén kapcsoló ("Helymegosztás aktív, műszak alatt"), hozzájárulással.
