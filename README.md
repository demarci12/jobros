# Jobro HVAC FSM

Magyar HVAC / klíma / gáz field service SaaS. Multi-tenant, NAV-álló, offline-képes.

## Dokumentáció (`docs/`)
| Fájl | Mit tartalmaz |
|------|---------------|
| `market-analysis.md` | Stratégia, moat, versenytársak (miért nyerünk) |
| `rendszerterv.md` | System design: adatmodell, SQL séma, RLS, API, integrációk |
| `build-plan.md` | 41 ticket (T-xx) sorrendben, függőséggel, elfogadási kritériummal |
| `ux-spec.md` | Képernyőnként megjelenítendő adatok és prioritás |

## Fejlesztés Claude Code-dal
1. A `CLAUDE.md` minden session elején betöltődik — ez a forrás a szabályokra.
2. Egy ticket = egy branch (`T-xx-nev`) = egy PR. Tartsd a `build-plan.md` sorrendet.
3. Prompt minta:
   > Olvasd be a docs/build-plan.md-ből a T-20 ticketet és a docs/rendszerterv.md 7. szakaszát. Implementáld az elfogadási kritérium szerint.
4. Implementálás után: `code-reviewer` subagent, adat-rétegnél `rls-auditor` is.
5. `/pr-status` parancs a PR-leíráshoz.

## Csapat-sávok (3 fő)
- **B1:** alap → CRM → jobs → munkalap/ajánlat → naptár → sablon → booking/dashboard
- **B2:** (T-23 után) mobil offline → számlázás/NAV → értesítés → PDF → cron
- **Te:** PM/review + RLS audit (T-91) + e2e (T-92) + pilot onboarding

## Integrációk (App Store)
Minden külső rendszer **connector** az app store-on át (Beállítások → Integrációk),
per-tenant telepítéssel — mint a Cal.com app store:
- **Számlázás:** Billingo, Számlázz.hu
- **Naptár:** Google, Apple (CalDAV), Outlook
- **Fizetés:** Stripe, SimplePay, Barion (Phase 2)
- **Üzenet:** Infobip (SMS), Resend (email)

**Auth:** Apple + Google + email (Supabase Auth). **Booking:** natív slot-motor
(a Cal.diy MIT kódja opcionális forrás, nem futásidejű függőség).

## Újrahasznosított open-source komponensek
| Réteg | OSS | Licenc |
|-------|-----|--------|
| Route optimization (dispatch) | VROOM + OSRM (self-host, EU OSM) | BSD-2 |
| Booking-logika kód-forrás | Cal.diy | MIT |
| Auth (Apple/Google/email) | Supabase Auth | — |
| E-signature (opció) | Documenso | AGPL* |
| Notifications (opció skálázáskor) | Novu | MIT core |

\*AGPL: csak különálló service-ként, nem a core-ba olvasztva. A core-ba csak MIT/BSD.

## Két fizetési sík (NE keverd)
- **SaaS-előfizetés:** a vállalkozó fizet nekünk (Stripe Billing + NAV-számla magunkról). Plan-ek, trial, plan-gating, billing portal — Függelék F, T-D1…D6.
- **In-app fizetés:** a vállalkozó ügyfele fizet a vállalkozónak (app store connector) — Függelék D, T-B6.

A regisztráció/onboarding trial-lel indul (14 nap), csapat-meghívással.

## Setup
```bash
npm install
cp .env.example .env.local   # töltsd ki a Supabase + integrációs kulcsokat
supabase db push             # migrációk
npm run dev
```
