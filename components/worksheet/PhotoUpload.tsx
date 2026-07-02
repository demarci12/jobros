"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Trash2, X } from "lucide-react";
import { toast } from "sonner";

type Attachment = { id: string; storage_path: string; caption: string | null; publicUrl?: string };

export function PhotoUpload({
  jobId,
  initialAttachments,
}: {
  jobId: string;
  initialAttachments: Attachment[];
}) {
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const { uploadPhoto } = await import("./worksheet-actions");
      for (const file of files) {
        if (file.size > 20 * 1024 * 1024) { toast.error(`${file.name}: max 20MB`); continue; }
        const arrayBuffer = await file.arrayBuffer();
        const result = await uploadPhoto({ jobId, fileName: file.name, mimeType: file.type, data: Array.from(new Uint8Array(arrayBuffer)) });
        if (result?.error) toast.error(result.error);
        else if (result?.attachment) setAttachments(prev => [...prev, result.attachment!]);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    const { deleteAttachment } = await import("./worksheet-actions");
    const result = await deleteAttachment(id, jobId);
    if (result?.error) toast.error(result.error);
    else setAttachments(prev => prev.filter(a => a.id !== id));
  }

  return (
    <div className="space-y-3">
      <input ref={fileInputRef} type="file" accept="image/*" multiple capture="environment"
        className="hidden" onChange={handleFileChange} />

      {attachments.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {attachments.map(a => (
            <div key={a.id} className="relative group rounded-lg overflow-hidden border aspect-square bg-muted">
              {a.publicUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.publicUrl} alt={a.caption ?? "Fotó"} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2 text-center">
                  {a.storage_path.split("/").pop()}
                </div>
              )}
              <button
                onClick={() => handleDelete(a.id)}
                aria-label="Fotó törlése"
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
          <Camera size={14} className="mr-1.5" />
          {uploading ? "Feltöltés…" : "Fotó hozzáadása"}
        </Button>
        <Button variant="ghost" size="sm" disabled={uploading} onClick={() => {
          if (fileInputRef.current) { fileInputRef.current.removeAttribute("capture"); fileInputRef.current.click(); }
        }}>
          <Upload size={14} className="mr-1.5" /> Fájlból
        </Button>
      </div>
    </div>
  );
}
