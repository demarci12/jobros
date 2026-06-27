import "server-only";
import type { CalendarProvider, CalendarEvent, BusySlot } from "@/lib/apps/types";

// Apple Calendar via CalDAV
// apiKey format: "https://user:app-specific-password@caldav.icloud.com/principal_url"
// The full CalDAV URL with credentials is stored in Vault as the secret.

function buildICSEvent(event: CalendarEvent, uid: string): string {
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(".000Z", "Z");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Jobro//CalDAV//HU",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(event.start)}`,
    `DTEND:${fmt(event.end)}`,
    `SUMMARY:${event.title}`,
    event.description ? `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}` : "",
    event.location ? `LOCATION:${event.location}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export class AppleCalDAVProvider implements CalendarProvider {
  readonly slug = "apple_calendar";
  readonly category = "calendar" as const;

  // calendarUrl: full CalDAV calendar collection URL, e.g.
  // https://user%40icloud.com:app-password@caldav.icloud.com/dav/calendars/users/user@icloud.com/home/
  constructor(private readonly calendarUrl: string) {}

  private get authHeader(): string {
    // Extract credentials from the URL
    try {
      const url = new URL(this.calendarUrl);
      const creds = `${url.username}:${url.password}`;
      return `Basic ${Buffer.from(creds).toString("base64")}`;
    } catch {
      return "";
    }
  }

  private get baseUrl(): string {
    try {
      const url = new URL(this.calendarUrl);
      return `${url.protocol}//${url.host}${url.pathname}`;
    } catch {
      return this.calendarUrl;
    }
  }

  async pushEvent(_userId: string, event: CalendarEvent): Promise<{ externalId: string }> {
    const uid = `jobro-${Date.now()}-${Math.random().toString(36).slice(2)}@jobro.hu`;
    const ics = buildICSEvent(event, uid);
    const eventUrl = `${this.baseUrl}${uid}.ics`;

    const res = await fetch(eventUrl, {
      method: "PUT",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "text/calendar; charset=utf-8",
      },
      body: ics,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Apple CalDAV pushEvent failed: ${err}`);
    }

    return { externalId: uid };
  }

  async updateEvent(externalId: string, event: CalendarEvent): Promise<void> {
    const ics = buildICSEvent(event, externalId);
    const eventUrl = `${this.baseUrl}${externalId}.ics`;

    const res = await fetch(eventUrl, {
      method: "PUT",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "text/calendar; charset=utf-8",
      },
      body: ics,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Apple CalDAV updateEvent failed: ${err}`);
    }
  }

  async deleteEvent(externalId: string): Promise<void> {
    const eventUrl = `${this.baseUrl}${externalId}.ics`;
    const res = await fetch(eventUrl, {
      method: "DELETE",
      headers: { Authorization: this.authHeader },
    });

    if (!res.ok && res.status !== 404) {
      const err = await res.text();
      throw new Error(`Apple CalDAV deleteEvent failed: ${err}`);
    }
  }

  async listBusy(_userId: string, from: Date, to: Date): Promise<BusySlot[]> {
    // REPORT query for busy/free time (CalDAV free-busy)
    const body = `<?xml version="1.0" encoding="utf-8" ?>
<C:free-busy-query xmlns:C="urn:ietf:params:xml:ns:caldav">
  <C:time-range start="${from.toISOString().replace(/[-:]/g, "").replace(".000Z", "Z")}"
                end="${to.toISOString().replace(/[-:]/g, "").replace(".000Z", "Z")}"/>
</C:free-busy-query>`;

    const res = await fetch(this.baseUrl, {
      method: "REPORT",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/xml; charset=utf-8",
        Depth: "1",
      },
      body,
    });

    if (!res.ok) return [];

    // Parse VCALENDAR VFREEBUSY from response — simplified: return empty on parse failure
    try {
      const text = await res.text();
      const slots: BusySlot[] = [];
      const fbRegex = /FREEBUSY(?:;FBTYPE=BUSY)?:([^\r\n]+)/g;
      let match: RegExpExecArray | null;
      while ((match = fbRegex.exec(text)) !== null) {
        const parts = match[1].split(",");
        for (const part of parts) {
          const [s, e] = part.split("/");
          if (s && e) {
            slots.push({ start: new Date(s), end: new Date(e) });
          }
        }
      }
      return slots;
    } catch {
      return [];
    }
  }
}
