"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PenLine, RotateCcw, Check } from "lucide-react";
import { toast } from "sonner";

export function SignaturePad({
  jobId,
  onSaved,
}: {
  jobId: string;
  onSaved?: (imageUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState<"customer" | "technician">("customer");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    setIsDrawing(true);
    lastPos.current = getPos(e, canvas);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext("2d");
    if (!ctx || !lastPos.current) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setHasStrokes(true);
  }

  function endDraw() { setIsDrawing(false); lastPos.current = null; }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  }

  async function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokes) return;
    setIsSaving(true);
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const base64 = dataUrl.split(",")[1];
      const { saveSignature } = await import("./worksheet-actions");
      const result = await saveSignature({ jobId, signerRole, signerName, base64 });
      if (result?.error) { toast.error(result.error); return; }
      toast.success("Aláírás mentve.");
      setSaved(true);
      onSaved?.(result.imageUrl!);
    } catch (err) {
      toast.error("Hiba az aláírás mentésekor.");
    } finally {
      setIsSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700 border border-green-200 rounded-lg px-4 py-3 bg-green-50">
        <Check size={15} />
        <span>Aláírás rögzítve.</span>
        <button className="ml-auto text-xs underline text-muted-foreground" onClick={() => { setSaved(false); clearCanvas(); }}>Új aláírás</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3 flex-wrap">
        <div className="space-y-1 flex-1 min-w-[140px]">
          <Label className="text-xs">Aláíró neve</Label>
          <Input value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="Ügyfél neve" className="h-8" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Szerepkör</Label>
          <select value={signerRole} onChange={e => setSignerRole(e.target.value as "customer" | "technician")}
            className="h-8 w-full rounded-md border bg-background px-2 text-sm">
            <option value="customer">Ügyfél</option>
            <option value="technician">Szerelő</option>
          </select>
        </div>
      </div>

      <div className="relative">
        <canvas ref={canvasRef} width={600} height={200}
          className="w-full rounded-lg border bg-white touch-none cursor-crosshair"
          style={{ maxHeight: 200 }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
        {!hasStrokes && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground/60">
              <PenLine size={16} />
              <span>Írj alá itt</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={clearCanvas} disabled={!hasStrokes}>
          <RotateCcw size={14} className="mr-1" /> Törlés
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!hasStrokes || isSaving}>
          <Check size={14} className="mr-1" /> {isSaving ? "Mentés…" : "Aláírás mentése"}
        </Button>
      </div>
    </div>
  );
}
