import { z } from "zod";

export const accountSchema = z.object({
  full_name: z.string().min(1, "Név megadása kötelező"),
  phone: z.string().optional(),
});

export const companySchema = z.object({
  name: z.string().min(2, "Legalább 2 karakter szükséges"),
  tax_number: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Érvénytelen e-mail cím").optional().or(z.literal("")),
});

export const inviteSchema = z.object({
  email: z.string().email("Érvénytelen e-mail cím"),
  role: z.enum(["dispatcher", "technician", "accountant"], {
    errorMap: () => ({ message: "Érvénytelen szerepkör" }),
  }),
});

export const roleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["owner", "dispatcher", "technician", "accountant"]),
});
