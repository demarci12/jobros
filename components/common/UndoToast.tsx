"use client";

import { toast } from "sonner";

interface UndoToastOptions {
  message: string;
  onUndo: () => void;
  duration?: number;
}

export function showUndoToast({ message, onUndo, duration = 5000 }: UndoToastOptions) {
  toast(message, {
    duration,
    action: {
      label: "Visszavonás",
      onClick: onUndo,
    },
  });
}
