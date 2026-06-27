import { describe, it, expect } from "vitest";
import {
  canTransition,
  assertTransition,
  InvalidTransitionError,
  type JobStatus,
} from "../lib/jobs/status-machine";

const ALL_STATUSES: JobStatus[] = [
  "uj", "felmeres", "arajanlat", "utemezve",
  "folyamatban", "kesz", "szamlazva", "fizetve",
  "elutasitva", "lemondva",
];

// ── Valid transitions (rendszerterv 8.7 mátrix) ──────────────────────────────

describe("valid transitions", () => {
  const VALID: [JobStatus, JobStatus][] = [
    ["uj",          "felmeres"],
    ["uj",          "arajanlat"],
    ["uj",          "utemezve"],
    ["uj",          "lemondva"],
    ["felmeres",    "arajanlat"],
    ["felmeres",    "utemezve"],
    ["felmeres",    "elutasitva"],
    ["felmeres",    "lemondva"],
    ["arajanlat",   "utemezve"],
    ["arajanlat",   "elutasitva"],
    ["arajanlat",   "lemondva"],
    ["utemezve",    "folyamatban"],
    ["utemezve",    "lemondva"],
    ["folyamatban", "kesz"],
    ["folyamatban", "lemondva"],
    ["kesz",        "folyamatban"],  // visszaküldés
    ["kesz",        "szamlazva"],
    ["szamlazva",   "fizetve"],
  ];

  for (const [from, to] of VALID) {
    it(`${from} → ${to}`, () => {
      expect(canTransition(from, to)).toBe(true);
      expect(() => assertTransition(from, to)).not.toThrow();
    });
  }
});

// ── Invalid transitions ───────────────────────────────────────────────────────

describe("invalid transitions", () => {
  const INVALID: [JobStatus, JobStatus][] = [
    ["fizetve",    "szamlazva"],   // végsó
    ["fizetve",    "uj"],
    ["elutasitva", "uj"],          // lezárt
    ["lemondva",   "uj"],
    ["szamlazva",  "kesz"],        // visszalépés tiltott
    ["kesz",       "uj"],
    ["folyamatban","uj"],
    ["uj",         "fizetve"],     // ugrás
    ["uj",         "kesz"],
    ["utemezve",   "szamlazva"],
  ];

  for (const [from, to] of INVALID) {
    it(`${from} → ${to} (tiltott)`, () => {
      expect(canTransition(from, to)).toBe(false);
      expect(() => assertTransition(from, to)).toThrow(InvalidTransitionError);
    });
  }
});

// ── InvalidTransitionError message ───────────────────────────────────────────

describe("InvalidTransitionError", () => {
  it("tartalmazza az átmenetet az üzenetben", () => {
    let err: unknown;
    try { assertTransition("fizetve", "uj"); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(InvalidTransitionError);
    expect((err as Error).message).toContain("fizetve");
    expect((err as Error).message).toContain("uj");
  });
});

// ── Terminális állapotok (nincs kifelé vezető út) ────────────────────────────

describe("terminális állapotok", () => {
  const TERMINAL: JobStatus[] = ["fizetve", "elutasitva", "lemondva"];

  for (const status of TERMINAL) {
    it(`${status} → egyetlen átmenet sem engedélyezett`, () => {
      for (const target of ALL_STATUSES) {
        expect(canTransition(status, target)).toBe(false);
      }
    });
  }
});

// ── Self-transition mindig tiltott ───────────────────────────────────────────

describe("self-transition", () => {
  for (const status of ALL_STATUSES) {
    it(`${status} → ${status} (tiltott)`, () => {
      expect(canTransition(status, status)).toBe(false);
    });
  }
});
