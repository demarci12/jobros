# Development plan — deferred big items

Ez a fájl azokat a nagyobb (több napos, infrastruktúrát is érintő) munkákat
követi, amiket a CEO stratégiai review (2026-07-02) azonosított, de nem
lettek azonnal megoldva, mert nem "egy ülésnyi" kód, hanem külön tervezést
és/vagy külső infrastruktúrát igényelnek. A kisebb, azonnal megoldható
találatok (entitlement gating hiányosságok, quote→worksheet auto-copy,
Számlázz.hu csonk connector) már javítva vannak a main-en.

## 1. Technikus mobil PWA (offline-first)

**Státusz:** nem létezik. `app/m/` a CLAUDE.md-ben dokumentálva van mint a
szerelő mobil felülete, de a könyvtár nincs a repóban. Nincs Dexie, nincs
manifest.json, nincs service worker. A szerelők jelenleg a desktop admin
felületet használják a telefonjukon, offline story nélkül — ez a legnagyobb
rés a tényleges napi felhasználó (kiszálláson lévő szerelő, gyenge net)
szempontjából.

**Kapcsolódó ticketek:** `docs/build-plan.md` T-77 (mobil PWA), T-78 (GPS) —
Phase 2, M10 mérföldkő.

**Miért külön kör:** offline szinkronizációs réteg (Dexie + queue + conflict
resolution), külön layout/routing fa, manifest + service worker regisztráció,
és valószínűleg új tesztstratégia (offline szimuláció). Ez tervezést igényel
(`/plan-eng-review` az `app/m/` architektúrára), nem egy gyors patch.

**Javasolt következő lépés:** `/office-hours` vagy `/plan-eng-review` az
`app/m/` architektúrájára — Dexie séma, sync-protokoll (last-write-wins vs.
conflict UI), mely képernyők kellenek MVP-hez (mai nap, munkalap kitöltés,
aláírás, fotó — offline queue-olva).

## 2. Smart dispatch (VROOM/OSRM)

**Státusz:** nem létezik. `booking_mode === "smart"` esetén a UI csendben a
`ManualSlotPicker`-re esik vissza — nincs `SmartSlotPicker.tsx`, nincs
`lib/dispatch/`, nincs VROOM/OSRM hívás sehol. Önmagát dokumentálja a
`docs/build-plan.md`-ben (T-24 ❌, T-25 ⚠️), tehát nem rejtett hiányosság —
de ha ez a termék külső kommunikációban "smart dispatch"-ként szerepel,
az a sztori ma nem létezik.

**Kapcsolódó ticket:** `docs/build-plan.md` T-24, T-80 — Phase 2, M11
mérföldkő.

**Miért külön kör:** VROOM + OSRM self-hosted konténer kell (Fly.io/Railway/
VPS, EU régió — CLAUDE.md szerint NEM futhat Vercelen), új API réteg a
route-optimalizáláshoz, és a `SmartSlotPicker` UI-t is meg kell építeni.

**Javasolt olcsóbb köztes lépés:** mielőtt a teljes VROOM/OSRM integrációba
vágnánk, egy egyszerű heurisztika (irányítószám/zóna szerinti klaszterezés +
legközelebbi szabad sáv javaslat) 60%-ban ugyanazt az értéket adja sokkal
kisebb erőfeszítéssel — lásd `docs/build-plan.md` "Utazási idő" nyitott
döntés (OSRM alap, H3-becslés tartalék).

## Már megoldva ebben a körben (2026-07-02)

- **Entitlement gating hiányosságok:** `updateJob`/`transitionJob` mostantól
  ellenőrzi az előfizetés read-only státuszát (`checkSubscriptionActive`).
  Az `app_store` feature-gate bekapcsolva a connector telepítésnél, de a
  számlázási connectorok (Billingo/Számlázz.hu, `category = 'invoicing'`)
  kivételt kapnak, mert alapfunkció minden csomagon — a Trial/Alap csomagok
  `app_store: false` beállítása mellett ez blokkolta volna a NAV-kötelező
  számlázást.
- **Quote → worksheet auto-copy:** elfogadott árajánlat kiválasztott sorai
  automatikusan bekerülnek a munkalapba (`lib/quotes/actions.ts:updateQuoteStatus`),
  a szerelőnek nem kell kétszer begépelnie.
- **Számlázz.hu csonk connector:** a katalógusból elrejtve (`is_active =
  false`), amíg nincs valódi implementáció a `lib/apps/registry.ts`
  `PROVIDER_MAP`-jában. A `resolveConnector` mostantól logol, ha egy
  telepített connectorhoz nincs implementáció, hogy ne csendben térjen
  vissza `null`-lal.
