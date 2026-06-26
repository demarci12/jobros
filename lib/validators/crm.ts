import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Kötelező"),
  is_company: z.boolean().default(false),
  tax_number: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Érvénytelen e-mail").optional().or(z.literal("")),
  notes: z.string().optional(),
});

export const siteSchema = z.object({
  label: z.string().optional(),
  address: z.string().min(1, "Kötelező"),
  city: z.string().optional(),
  zip: z.string().optional(),
  access_notes: z.string().optional(),
});

export const equipmentSchema = z.object({
  kind: z.enum(["klima", "kazan", "hoszivattyu", "legkezelo", "egyeb"]),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  installed_at: z.string().optional(),
  warranty_until: z.string().optional(),
  notes: z.string().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type SiteInput = z.infer<typeof siteSchema>;
export type EquipmentInput = z.infer<typeof equipmentSchema>;
