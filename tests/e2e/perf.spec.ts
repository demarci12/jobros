/**
 * Perf benchmark — page load time thresholds
 *
 * Measures time-to-interactive for the slowest pages and fails if any
 * exceeds the threshold. Run after login to test authenticated pages.
 *
 * Futtatás:
 *   E2E_EMAIL, E2E_PASSWORD env változókkal
 *   PLAYWRIGHT_BASE_URL (alapértelmezett: http://localhost:3000)
 *
 * Thresholds (ms) — 3G emulation OFF (LAN/prod CDN):
 *   Dashboard:      1500ms
 *   Jobs list:      1500ms
 *   Customer detail: 2000ms  (8 queries, parallelised)
 *   Worksheet:      2000ms  (8 queries + conditional lines)
 *   Calendar week:  2000ms  (4 queries + DnD calendar render)
 *   Raktar:         1500ms
 */

import { test, expect, type Page } from "@playwright/test";

const EMAIL    = process.env.E2E_EMAIL ?? "";
const PASSWORD = process.env.E2E_PASSWORD ?? "";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

test.skip(!EMAIL || !PASSWORD, "E2E_EMAIL és E2E_PASSWORD env változók szükségesek");

// Thresholds in ms — time from navigation start to page being interactive
const THRESHOLDS: Record<string, number> = {
  dashboard:       1500,
  jobs:            1500,
  "customer-detail": 2000,
  worksheet:       2000,
  calendar:        2000,
  raktar:          1500,
};

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[type="email"]', EMAIL);
  await page.fill('[type="password"]', PASSWORD);
  await page.click('[type="submit"]');
  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 15_000 });
}

/**
 * Measures wall-clock load time for a page.
 * Returns ms from navigationStart to DOMContentLoaded.
 */
async function measureLoad(page: Page, url: string): Promise<number> {
  const start = Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  return Date.now() - start;
}

test.describe("Oldalak betöltési ideje", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Dashboard betölt < 1500ms", async ({ page }) => {
    const ms = await measureLoad(page, `${BASE_URL}/dashboard`);
    console.log(`Dashboard: ${ms}ms`);
    expect(ms, `Dashboard lassú: ${ms}ms > ${THRESHOLDS.dashboard}ms`).toBeLessThan(THRESHOLDS.dashboard);
  });

  test("Munkák lista betölt < 1500ms", async ({ page }) => {
    const ms = await measureLoad(page, `${BASE_URL}/jobs`);
    console.log(`Jobs: ${ms}ms`);
    expect(ms, `Jobs lista lassú: ${ms}ms > ${THRESHOLDS.jobs}ms`).toBeLessThan(THRESHOLDS.jobs);
  });

  test("Naptár betölt < 2000ms", async ({ page }) => {
    const ms = await measureLoad(page, `${BASE_URL}/calendar`);
    console.log(`Calendar: ${ms}ms`);
    expect(ms, `Naptár lassú: ${ms}ms > ${THRESHOLDS.calendar}ms`).toBeLessThan(THRESHOLDS.calendar);
  });

  test("Raktár betölt < 1500ms", async ({ page }) => {
    const ms = await measureLoad(page, `${BASE_URL}/raktar`);
    console.log(`Raktar: ${ms}ms`);
    expect(ms, `Raktár lassú: ${ms}ms > ${THRESHOLDS.raktar}ms`).toBeLessThan(THRESHOLDS.raktar);
  });

  // Customer detail and worksheet tests need real IDs — skip if not provided
  test("Ügyfél részletek betölt < 2000ms (ha PERF_CUSTOMER_ID megadva)", async ({ page }) => {
    const customerId = process.env.PERF_CUSTOMER_ID;
    if (!customerId) {
      test.skip(true, "PERF_CUSTOMER_ID env változó szükséges");
      return;
    }
    const ms = await measureLoad(page, `${BASE_URL}/customers/${customerId}`);
    console.log(`Customer detail: ${ms}ms`);
    expect(ms, `Ügyfél oldal lassú: ${ms}ms > ${THRESHOLDS["customer-detail"]}ms`).toBeLessThan(THRESHOLDS["customer-detail"]);
  });

  test("Munkalap betölt < 2000ms (ha PERF_JOB_ID megadva)", async ({ page }) => {
    const jobId = process.env.PERF_JOB_ID;
    if (!jobId) {
      test.skip(true, "PERF_JOB_ID env változó szükséges");
      return;
    }
    const ms = await measureLoad(page, `${BASE_URL}/jobs/${jobId}/worksheet`);
    console.log(`Worksheet: ${ms}ms`);
    expect(ms, `Munkalap lassú: ${ms}ms > ${THRESHOLDS.worksheet}ms`).toBeLessThan(THRESHOLDS.worksheet);
  });
});

/**
 * Lighthouse-style Core Web Vitals check using browser Performance API.
 * Measures LCP (Largest Contentful Paint) via PerformanceObserver.
 */
test.describe("Core Web Vitals (LCP)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  async function measureLCP(page: Page, url: string): Promise<number> {
    await page.goto(url, { waitUntil: "networkidle" });
    const lcp = await page.evaluate((): Promise<number> => {
      return new Promise(resolve => {
        let maxLcp = 0;
        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === "largest-contentful-paint") {
              maxLcp = (entry as any).startTime;
            }
          }
        });
        observer.observe({ type: "largest-contentful-paint", buffered: true });
        // Give it 500ms to collect buffered entries
        setTimeout(() => { observer.disconnect(); resolve(maxLcp); }, 500);
      });
    });
    return lcp;
  }

  test("Dashboard LCP < 2500ms", async ({ page }) => {
    const lcp = await measureLCP(page, `${BASE_URL}/dashboard`);
    console.log(`Dashboard LCP: ${lcp}ms`);
    expect(lcp, `Dashboard LCP túl magas: ${lcp}ms`).toBeLessThan(2500);
  });
});
