import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().min(1, "Kötelező"),
  activity: z.enum(["szerviz", "telepites", "felszeres", "csere", "felmeres", "garancias", "egyeb"]).default("szerviz"),
  default_duration_min: z.coerce.number().int().min(15).max(480).default(60),
  requires_survey: z.boolean().default(false),
  follow_up_count: z.coerce.number().int().min(0).max(10).default(2),
  default_price: z.coerce.number().min(0).optional().nullable(),
  vat_rate: z.coerce.number().min(0).max(27).default(27),
  color: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  default_quote_template_id: z.string().uuid().optional().nullable(),
  default_worksheet_template_id: z.string().uuid().optional().nullable(),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
