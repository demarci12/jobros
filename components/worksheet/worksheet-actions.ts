"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

async function getJobCtx(jobId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) return null;
  const { data: job } = await supabase
    .from("jobs").select("id, assigned_to")
    .eq("id", jobId).eq("company_id", cu.company_id).maybeSingle();
  if (!job) return null;
  const canWrite = ["owner", "dispatcher"].includes(cu.role) || job.assigned_to === user.id;
  return { supabase, companyId: cu.company_id as string, userId: user.id, canWrite };
}

export async function saveSignature({
  jobId,
  signerRole,
  signerName,
  base64,
}: {
  jobId: string;
  signerRole: string;
  signerName: string;
  base64: string;
}) {
  const ctx = await getJobCtx(jobId);
  if (!ctx?.canWrite) return { error: "Nincs jogosultság." };

  const service = createServiceClient();
  const fileName = `${ctx.companyId}/${jobId}/${Date.now()}.png`;
  const buffer = Buffer.from(base64, "base64");

  const { error: uploadError } = await service.storage
    .from("signatures")
    .upload(fileName, buffer, { contentType: "image/png", upsert: false });
  if (uploadError) return { error: uploadError.message };

  const { data: { publicUrl } } = service.storage.from("signatures").getPublicUrl(fileName);

  const { error: dbError } = await ctx.supabase.from("signatures").insert({
    company_id: ctx.companyId,
    job_id: jobId,
    signer_role: signerRole,
    signer_name: signerName || null,
    image_url: publicUrl,
  });
  if (dbError) return { error: dbError.message };

  revalidatePath(`/jobs/${jobId}/worksheet`);

  // Customer signature = confirmed delivery → deduct stock for all material-linked lines atomically.
  // We only deduct once (on the first customer signature; technician sig doesn't trigger it).
  if (signerRole === "customer") {
    const { data: worksheet } = await ctx.supabase
      .from("worksheets").select("id")
      .eq("job_id", jobId).eq("company_id", ctx.companyId).maybeSingle();

    if (worksheet) {
      const { error: stockErr } = await ctx.supabase.rpc("deduct_worksheet_stock", {
        p_worksheet_id: worksheet.id,
        p_user_id: ctx.userId,
      });
      if (stockErr && !stockErr.message?.includes("unique")) {
        console.error("Stock deduction error:", stockErr);
      }
    }
  }

  return { imageUrl: publicUrl };
}

export async function uploadPhoto({
  jobId,
  fileName,
  mimeType,
  data,
}: {
  jobId: string;
  fileName: string;
  mimeType: string;
  data: number[];
}) {
  const ctx = await getJobCtx(jobId);
  if (!ctx?.canWrite) return { error: "Nincs jogosultság." };

  const service = createServiceClient();
  const ext = fileName.split(".").pop() ?? "jpg";
  const storagePath = `${ctx.companyId}/${jobId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(data);

  const { error: uploadError } = await service.storage
    .from("attachments")
    .upload(storagePath, buffer, { contentType: mimeType, upsert: false });
  if (uploadError) return { error: uploadError.message };

  const { data: { publicUrl } } = service.storage.from("attachments").getPublicUrl(storagePath);

  const { data: att, error: dbError } = await ctx.supabase.from("attachments").insert({
    company_id: ctx.companyId,
    job_id: jobId,
    kind: "photo",
    storage_path: storagePath,
    uploaded_by: ctx.userId,
  }).select("id, storage_path, caption").single();
  if (dbError) return { error: dbError.message };

  revalidatePath(`/jobs/${jobId}/worksheet`);
  return { attachment: { ...att, publicUrl } };
}

export async function deleteAttachment(attachmentId: string, jobId: string) {
  const ctx = await getJobCtx(jobId);
  if (!ctx?.canWrite) return { error: "Nincs jogosultság." };

  const { data: att } = await ctx.supabase.from("attachments")
    .select("storage_path").eq("id", attachmentId).eq("company_id", ctx.companyId).maybeSingle();
  if (!att) return { error: "Nem található." };

  const service = createServiceClient();
  await service.storage.from("attachments").remove([att.storage_path]);

  const { error } = await ctx.supabase.from("attachments")
    .delete().eq("id", attachmentId).eq("company_id", ctx.companyId);
  if (error) return { error: error.message };

  revalidatePath(`/jobs/${jobId}/worksheet`);
  return { success: true };
}
