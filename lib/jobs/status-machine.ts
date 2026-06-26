export type JobStatus =
  | "uj" | "felmeres" | "arajanlat" | "utemezve"
  | "folyamatban" | "kesz" | "szamlazva" | "fizetve"
  | "elutasitva" | "lemondva";

// Státusz-átmenet mátrix (rendszerterv 8.7)
const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  uj:           ["felmeres", "arajanlat", "utemezve", "lemondva"],
  felmeres:     ["arajanlat", "utemezve", "elutasitva", "lemondva"],
  arajanlat:    ["utemezve", "elutasitva", "lemondva"],
  utemezve:     ["folyamatban", "lemondva"],
  folyamatban:  ["kesz", "lemondva"],
  kesz:         ["folyamatban", "szamlazva"],
  szamlazva:    ["fizetve"],
  fizetve:      [],
  elutasitva:   [],
  lemondva:     [],
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export class InvalidTransitionError extends Error {
  constructor(from: JobStatus, to: JobStatus) {
    super(`Érvénytelen státuszváltás: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition(from: JobStatus, to: JobStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

export const STATUS_LABELS: Record<JobStatus, string> = {
  uj: "Új", felmeres: "Felmérés", arajanlat: "Árajánlat",
  utemezve: "Ütemezve", folyamatban: "Folyamatban", kesz: "Kész",
  szamlazva: "Számlázva", fizetve: "Fizetve",
  elutasitva: "Elutasítva", lemondva: "Lemondva",
};

export const STATUS_COLORS: Record<JobStatus, string> = {
  uj: "bg-slate-100 text-slate-700",
  felmeres: "bg-yellow-100 text-yellow-800",
  arajanlat: "bg-orange-100 text-orange-800",
  utemezve: "bg-blue-100 text-blue-800",
  folyamatban: "bg-indigo-100 text-indigo-800",
  kesz: "bg-green-100 text-green-800",
  szamlazva: "bg-teal-100 text-teal-800",
  fizetve: "bg-emerald-100 text-emerald-800",
  elutasitva: "bg-red-100 text-red-800",
  lemondva: "bg-gray-100 text-gray-600",
};
