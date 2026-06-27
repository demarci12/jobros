"use client";

import { useState, useTransition } from "react";
import { upsertNotificationSetting } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type NotificationSetting = {
  event: string;
  label: string;
  is_enabled: boolean;
  channels: ("sms" | "email")[];
  template: string;
  defaultTemplate: string;
};

function ChannelToggle({
  channel,
  checked,
  onChange,
  disabled,
}: {
  channel: "sms" | "email";
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-center gap-1.5 cursor-pointer select-none text-sm ${disabled ? "opacity-50 cursor-default" : ""}`}>
      <input
        type="checkbox"
        className="h-3.5 w-3.5"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
      />
      {channel === "sms" ? "SMS" : "Email"}
    </label>
  );
}

function SettingRow({
  setting,
  canEdit,
}: {
  setting: NotificationSetting;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEnabled, setIsEnabled] = useState(setting.is_enabled);
  const [channels, setChannels] = useState<("sms" | "email")[]>(setting.channels);
  const [template, setTemplate] = useState(setting.template);
  const [showTemplate, setShowTemplate] = useState(false);
  const isDirty =
    isEnabled !== setting.is_enabled ||
    JSON.stringify(channels.sort()) !== JSON.stringify([...setting.channels].sort()) ||
    template !== setting.template;

  function toggleChannel(ch: "sms" | "email", on: boolean) {
    setChannels(prev => on ? Array.from(new Set([...prev, ch])) : prev.filter(c => c !== ch));
  }

  function handleSave() {
    if (channels.length === 0) {
      toast.error("Legalább egy csatornát válassz ki.");
      return;
    }
    startTransition(async () => {
      const res = await upsertNotificationSetting({
        event: setting.event,
        is_enabled: isEnabled,
        channels,
        template: template !== setting.defaultTemplate ? template : undefined,
      });
      if (res?.error) toast.error(res.error);
      else { toast.success("Beállítás mentve."); router.refresh(); }
    });
  }

  return (
    <div className={`rounded-lg border p-4 space-y-3 transition-opacity ${!isEnabled ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {canEdit && (
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0"
              checked={isEnabled}
              onChange={e => setIsEnabled(e.target.checked)}
            />
          )}
          <span className="font-medium text-sm truncate">{setting.label}</span>
        </div>
        <div className="flex items-center gap-3">
          <ChannelToggle channel="sms" checked={channels.includes("sms")}
            onChange={v => toggleChannel("sms", v)} disabled={!canEdit || !isEnabled} />
          <ChannelToggle channel="email" checked={channels.includes("email")}
            onChange={v => toggleChannel("email", v)} disabled={!canEdit || !isEnabled} />
          <button
            className="text-xs text-muted-foreground hover:underline"
            onClick={() => setShowTemplate(v => !v)}
          >
            {showTemplate ? "↑ Sablon" : "Sablon ↓"}
          </button>
        </div>
      </div>

      {showTemplate && (
        <div className="space-y-1.5">
          <Textarea
            value={template}
            onChange={e => setTemplate(e.target.value)}
            rows={3}
            disabled={!canEdit || !isEnabled}
            className="text-sm resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Változók: {"{customer_name}"}, {"{technician_name}"}, {"{job_number}"}, {"{appointment_date}"}, {"{appointment_time}"}, {"{amount}"}
          </p>
          {template !== setting.defaultTemplate && (
            <button
              className="text-xs text-muted-foreground hover:underline"
              onClick={() => setTemplate(setting.defaultTemplate)}
            >
              Visszaállítás alapértelmezettre
            </button>
          )}
        </div>
      )}

      {canEdit && isDirty && (
        <div className="flex justify-end">
          <Button size="sm" disabled={isPending} onClick={handleSave}>
            {isPending ? "Mentés…" : "Mentés"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function NotificationsClient({
  settings,
  canEdit,
}: {
  settings: NotificationSetting[];
  canEdit: boolean;
}) {
  return (
    <div className="space-y-3">
      {settings.map(s => (
        <SettingRow key={s.event} setting={s} canEdit={canEdit} />
      ))}
    </div>
  );
}
