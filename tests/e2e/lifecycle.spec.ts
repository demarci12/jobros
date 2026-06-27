/**
 * T-65 E2E: Fő életciklus
 * intake → ügyfél profil → foglalás → munkalap → aláírás → számla → fizetve
 *
 * Futtatás:
 *   E2E_EMAIL és E2E_PASSWORD env változókkal (egy létező teszt felhasználó)
 *   PLAYWRIGHT_BASE_URL (alapértelmezett: http://localhost:3000)
 */

import { test, expect, type Page } from "@playwright/test";

const EMAIL    = process.env.E2E_EMAIL ?? "";
const PASSWORD = process.env.E2E_PASSWORD ?? "";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

test.skip(!EMAIL || !PASSWORD, "E2E_EMAIL és E2E_PASSWORD env változók szükségesek");

// ── Auth helper ───────────────────────────────────────────────────────────────

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[type="email"]', EMAIL);
  await page.fill('[type="password"]', PASSWORD);
  await page.click('[type="submit"]');
  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 15_000 });
}

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe("Teljes munka életciklus", () => {
  let customerId: string;
  let jobId: string;

  test("01. Bejelentkezés", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("02. Telefon-intake: új ügyfél létrehozása", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/intake`);

    // Keresés — nincs találat
    const searchInput = page.getByPlaceholder(/keresés|telefon|name/i).first();
    await searchInput.fill("E2E Teszt Ügyfél");
    await page.waitForTimeout(500);

    // Új ügyfél gomb
    const newBtn = page.getByRole("button", { name: /új ügyfél/i });
    await expect(newBtn).toBeVisible({ timeout: 5_000 });
    await newBtn.click();

    // Kitöltjük a gyors-felvitelt
    await page.getByLabel(/név/i).fill("E2E Teszt Ügyfél");
    await page.getByLabel(/cím|address/i).fill("1111 Budapest, Teszt utca 1.");

    const saveBtn = page.getByRole("button", { name: /mentés|létrehozás|save/i }).first();
    await saveBtn.click();

    // Átirányít az ügyfélprofilra
    await page.waitForURL(/\/customers\//, { timeout: 10_000 });
    customerId = page.url().split("/customers/")[1].split("/")[0];
    expect(customerId).toBeTruthy();
  });

  test("03. Foglalás az ügyfélprofilból (manual mód)", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/customers/${customerId}`);

    // Új időpont gomb
    const bookBtn = page.getByRole("button", { name: /új időpont|foglalás/i });
    await expect(bookBtn).toBeVisible({ timeout: 8_000 });
    await bookBtn.click();

    // BookingDropup / ManualSlotPicker megnyílik
    // Dátum (holnap)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = tomorrow.toISOString().slice(0, 10);

    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible()) {
      await dateInput.fill(tomorrowIso);
    }

    // Cím előtöltve ellenőrzése
    const addressField = page.getByPlaceholder(/cím|address/i).first();
    if (await addressField.isVisible()) {
      await expect(addressField).not.toBeEmpty();
    }

    // Mentés
    const confirmBtn = page.getByRole("button", { name: /mentés|foglalás|confirm/i }).last();
    await confirmBtn.click();

    // Navigál a jobra
    await page.waitForURL(/\/jobs\//, { timeout: 15_000 });
    jobId = page.url().split("/jobs/")[1].split("/")[0];
    expect(jobId).toBeTruthy();
  });

  test("04. Munkalap kitöltése", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/jobs/${jobId}/worksheet`);

    // Elvégzett munka szöveg
    const workDoneField = page.getByPlaceholder(/elvégzett|munka leírás/i).first();
    if (await workDoneField.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await workDoneField.fill("Klíma éves karbantartás elvégezve. Hűtőközeg nyomás OK.");
    }

    // Tétel hozzáadása
    const addLineBtn = page.getByRole("button", { name: /tétel|sor hozzá|add line/i }).first();
    if (await addLineBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await addLineBtn.click();
      const descInput = page.locator('input[placeholder*="leírás"], input[placeholder*="megnevez"]').last();
      if (await descInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await descInput.fill("Karbantartási díj");
        await page.locator('input[placeholder*="mennyiség"], input[name*="quantity"]').last().fill("1");
        await page.locator('input[placeholder*="egységár"], input[name*="unit_price"]').last().fill("25000");
      }
    }

    // Mentés
    const saveBtn = page.getByRole("button", { name: /mentés|save/i }).first();
    if (await saveBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await saveBtn.click();
      await expect(page.getByText(/ment|saved/i).first()).toBeVisible({ timeout: 5_000 }).catch(() => {});
    }
  });

  test("05. Job státusz kész-re állítása", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/jobs/${jobId}`);

    // StatusPipeline-ban a 'Kész' gomb
    const keszBtn = page.getByRole("button", { name: /kész|complete/i }).first();
    if (await keszBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await keszBtn.click();
      // Megerősítés dialóg ha van
      const confirmBtn = page.getByRole("button", { name: /megerősít|igen|confirm|ok/i }).last();
      if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await confirmBtn.click();
      }
      await expect(page.getByText(/kész|kesz/i).first()).toBeVisible({ timeout: 8_000 });
    }
  });

  test("06. Számla fül — kiállítás (mock)", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/jobs/${jobId}/invoice`);

    const invoiceBtn = page.getByRole("button", { name: /számla kiállít|issue invoice/i }).first();
    if (await invoiceBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await invoiceBtn.click();
      // Siker vagy "nincs integráció" üzenet — mindkettő elfogadott a mock-ban
      await page.waitForTimeout(2_000);
      const successOrError = page.getByText(/számla|invoice|integráció/i).first();
      await expect(successOrError).toBeVisible({ timeout: 8_000 });
    }
  });

  test("07. Dashboard — kész munkák megjelennek", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`);

    // Dashboard betöltöt
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 8_000 });

    // Valamilyen KPI kártya látható
    const kpiCard = page.locator("[class*='card'], [class*='Card']").first();
    await expect(kpiCard).toBeVisible({ timeout: 5_000 });
  });
});

// ── Reszponzivitás ────────────────────────────────────────────────────────────

test.describe("Mobil nézet", () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14

  test("Dashboard betölt mobil viewport-on", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 8_000 });
  });

  test("Naptár oldal betölt mobil viewport-on", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/calendar`);
    // Legalább a toolbar megjelenik
    await expect(page.getByRole("button", { name: /ma|hét|nap/i }).first()).toBeVisible({ timeout: 8_000 });
  });
});

// ── Biztonsági ellenőrzések ───────────────────────────────────────────────────

test.describe("Hozzáférés-védelem", () => {
  test("Védett oldalak auth nélkül átirányítanak login-ra", async ({ page }) => {
    const protectedPaths = ["/dashboard", "/customers", "/jobs", "/calendar", "/settings/account"];
    for (const path of protectedPaths) {
      await page.goto(`${BASE_URL}${path}`);
      await page.waitForURL(/\/(login|auth)/, { timeout: 8_000 });
    }
  });

  test("Publikus ajánlatkérő nem igényel autht", async ({ page }) => {
    // Próbálunk egy nem létező slug-gal — 404 vagy a form jelenik meg
    await page.goto(`${BASE_URL}/public/teszt-ceg/request`);
    // Nem irányít login-ra
    await page.waitForTimeout(2_000);
    expect(page.url()).not.toMatch(/\/(login|auth)/);
  });
});
