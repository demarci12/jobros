export type NotificationEvent =
  | "technician_on_the_way"
  | "quote_ready"
  | "invoice_sent"
  | "service_reminder"
  | "appointment_confirmed"
  | "appointment_cancelled"
  | "trial_ending";

export const DEFAULT_TEMPLATES: Record<NotificationEvent, string> = {
  technician_on_the_way:
    "Kedves {customer_name}! Szerelőnk {technician_name} hamarosan megérkezik. Jobro",
  quote_ready:
    "Kedves {customer_name}! Elkészült az árajánlata ({job_number}). Jobro",
  invoice_sent:
    "Kedves {customer_name}! A számlája ({invoice_number}) kiállítva: {amount} Ft. Jobro",
  service_reminder:
    "Kedves {customer_name}! {days_left} napon belül esedékes a(z) {equipment_name} szervize. Hívjon minket! Jobro",
  appointment_confirmed:
    "Kedves {customer_name}! Időpontja megerősítve: {appointment_date} {appointment_time}. Jobro",
  appointment_cancelled:
    "Kedves {customer_name}! {appointment_date} {appointment_time}-i időpontja lemondva. Jobro",
  trial_ending:
    "Kedves {customer_name}! A Jobro próbaidőszaka {days_left} nap múlva ({trial_ends_at}) lejár. Az előfizetés a Beállítások → Előfizetés menüben megújítható. Jobro csapata",
};

export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`);
}
