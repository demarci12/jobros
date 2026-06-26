---
description: Összefoglalja az aktuális munkát PR-leíráshoz — mi változott, melyik ticket, mi a következő lépés.
---

Vesd össze a working tree változásait a HEAD-del (`git diff HEAD --stat` és a részletek).
Készíts egy magyar PR-leírást ebben a formában:

## T-xx — <ticket cím>
**Mit csinál:** 1-2 mondat.
**Érintett fájlok:** felsorolás.
**Elfogadási kritérium:** a build-plan szerinti kritérium + jelöld, teljesül-e.
**Tesztelve:** milyen teszt futott / mit kéne még.
**Következő ticket:** a függőségi lánc szerinti következő T-xx.

Ha a változás érinti az architektúrát, tech stacket, teszt-konvenciót vagy biztonságot,
emlékeztess: frissíteni kell a CLAUDE.md-t.
