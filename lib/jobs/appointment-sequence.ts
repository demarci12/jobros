export type AppointmentKind = "felmeres" | "munka" | "kovetes";

type ServiceForSequence = {
  requires_survey: boolean;
  follow_up_count: number;
};

type ExistingAppointment = {
  kind: AppointmentKind;
};

const LABELS: Record<AppointmentKind, string> = {
  felmeres: "Felmérés",
  munka: "Munka / kiszállás",
  kovetes: "Követő látogatás",
};

export function getSequenceLabel(kind: AppointmentKind): string {
  return LABELS[kind];
}

export function getNextAppointmentKind(
  service: ServiceForSequence | null | undefined,
  existingAppointments: ExistingAppointment[],
): AppointmentKind {
  const hasFelmeres = existingAppointments.some(a => a.kind === "felmeres");
  const hasMunka = existingAppointments.some(a => a.kind === "munka");
  const kovetesCount = existingAppointments.filter(a => a.kind === "kovetes").length;
  const followUpCount = service?.follow_up_count ?? 2;

  if (service?.requires_survey && !hasFelmeres) return "felmeres";
  if (!hasMunka) return "munka";
  if (kovetesCount < followUpCount) return "kovetes";
  return "kovetes";
}
