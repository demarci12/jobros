-- A Számlázz.hu connector szerepelt a katalógusban, de a lib/apps/registry.ts
-- PROVIDER_MAP-jában nincs hozzá implementáció — ha egy tenant telepítette,
-- a resolveInvoicingProvider() csendben null-t adott vissza. Amíg nincs valódi
-- connector, elrejtjük a katalógusból, hogy ne lehessen becsapódni bele.

update app_definitions set is_active = false where slug = 'szamlazz';
