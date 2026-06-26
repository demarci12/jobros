# Jobro HVAC — Piac- és moat-elemzés

> Háttér-dokumentum: miért nyerünk, és mi a védhető pozíció. A US/UK FSM modellek tanulságai a magyar HVAC/gáz piacra fordítva. Nem implementációs anyag — stratégiai referencia a termék-döntésekhez.

## A 4 moat-réteg (a termék védhetősége)
A legvédhetőbb modellek hármat kombinálnak: **recurring revenue + beépített fizetés/finanszírozás + proprietary adat**. A tiszta lead-gen marketplace (Angi, Thumbtack) a leggyengébb moat — AI és multi-homing már bontja.

| Réteg | Mit ad | Fázis | Versenytárs (HU) lefedi? |
|-------|--------|-------|--------------------------|
| **Smart dispatch** — okos foglalás | H3/zóna-alapú szerelő-választás, utazási buffer, kétlépcsős (felmérés→munka) foglalás | P1 | ❌ Nem |
| **Lock-in** — workflow + adat | Berendezés-nyilvántartás, szervizmúlt, CRM | P1–2 | Részben |
| **Fintech** — beépített fizetés | Barion/SimplePay a munkalapon, részletfizetés | P2 | ❌ Nem |
| **Recurring** — tagság motor | Karbantartási szerződés, autopay, emlékeztető | P2 | ❌ Nem |

## Tanulságok a referencia-modellekből
- **ServiceTitan** (US, tőzsdei): all-in-one vertical SaaS + fintech + proprietary adat (~109M job/év táplálja az AI-t). A legjobban átültethető tézis, de nincs magyar lokalizáció.
- **Jobber / Housecall Pro** (US): SMB workflow lock-in + beépített finanszírozás (Wisetack). A "konyhaasztalnál mutatott havi részlet" close-rate eszköz — átültethető nagy tételű magyar munkákra.
- **BOXT** (UK): "boiler-as-a-service" — hardver + szoftver + finanszírozás + szerviz előfizetés. Magyar megfelelő (kazán/klíma előfizetés) Phase 3.
- **Frontdoor / British Gas HomeCare**: biztosítás-jellegű recurring + saját szerelőhálózat + aktuáriusi adat. Erős, de licenc-igényes (a licenc maga a moat).
- **Urban Company** (India, tőzsdei): full-stack managed marketplace — képzés + eszköz + standardizálás. A legjobb válasz a minőség-ingadozásra; tőkeigényes (Phase 3 opció).
- **Wisetack** (US): beépített POS-finanszírozás trades-nek; a finanszírozott munka átlagosan 4,5× nagyobb. CEE-ben alulépített — magas moat.

## Magyar piaci kontextus
- **Nincs lokalizált nyugati FSM.** A ServiceTitan/Jobber/Housecall/Tradify nem magyar (nincs NAV, HUF). A magyar cégek kötelező **NAV-os számlázót** használnak: **Számlázz.hu** (680k+ cég) és **Billingo** (160k+ cég) — de ezek számlázók, nem dispatch/job-management FSM. Ez a fő white space.
- **A meglévő marketplace-ek kicsik.** JóSzaki (előfizetéses katalógus, ~HUF 378–566M bevétel, ~14 fő, nincs VC; Cápák között 2024 — befektetés nélkül távozott). Qjob (Barion escrow). Egyik sem FSM.
- **A két fő FSM-versenytárs:**
  - **OkosMunkalap** — modern, app-first, villany/klíma/víz fókusz; Billingo+Számlázz.hu integráció, csomagok 3 990–19 990 Ft/hó. Komoly termék, de nincs smart dispatch, nincs beépített fizetés, nincs recurring tagság motor.
  - **onlinemunkalap (HexaFlow Kft.)** — ~90M HUF bevétel, csökkenő profit, <10 fő, generikus "digitális munkalap". Nem fenyegető.
- **Strukturális hajtóerők a fizetés/trust moatra:** informális gazdaság ~24% GDP (építőiparban koncentrált), készpénz >46% tranzakció, de instant rails létezik (AFR 2020, qvik 2024) + Barion/SimplePay. A trades piac erősen fragmentált és informális — a CRM + okos foglalás + pénzmozgás együtt ad védhető pozíciót.

## Stratégiai következtetés
A belépő: **CRM + okos foglalás egy helyen** — a jelenlegi gyakorlat (füzet/Google Naptár, semmi ügyféltárhely) ezt nem adja, a fejlettebb cégeknél van CRM de nincs dispatch/munkalap/ajánlat. Ne generikus munkalapban versenyezz (ott az OkosMunkalap jó) — a moat a **smart dispatch + pénzmozgás (fintech) + recurring tagság**, amit a versenytársak nem fognak egyhamar megcsinálni. A wedge: NAV e-számlázás + instant fizetés az informális piac ellen.

## Három fázis (küszöbökkel)
1. **Validate (0–6 hó):** lokalizált, NAV-álló, HVAC-specifikus FSM egy szakmára (gáz/klíma). Küszöb: 50–100 fizető cég, >70% retention.
2. **Moat (6–18 hó):** tagság motor + beépített fizetés + részletfizetés. Küszöb: tagság retention >85%, fizetett tranzakció >30%.
3. **Scale (18–36 hó):** vagy full-stack marketplace (Urban Company), vagy roll-up (Sila/Apex), + kazán/klíma előfizetés (BOXT). CEE lokalizáció.
