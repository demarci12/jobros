import "server-only";
import type { CalendarProvider, CalendarEvent, BusySlot } from "@/lib/apps/types";

// Google Calendar provider (OAuth token passed as apiKey from Vault)
export class GoogleCalendarProvider implements CalendarProvider {
  readonly slug = "google_calendar";
  readonly category = "calendar" as const;

  constructor(private readonly accessToken: string) {}

  async pushEvent(userId: string, event: CalendarEvent): Promise<{ externalId: string }> {
    const body = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: { dateTime: event.start.toISOString() },
      end: { dateTime: event.end.toISOString() },
    };

    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Calendar pushEvent failed: ${err}`);
    }

    const data = await res.json();
    return { externalId: data.id as string };
  }

  async updateEvent(externalId: string, event: CalendarEvent): Promise<void> {
    const body = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: { dateTime: event.start.toISOString() },
      end: { dateTime: event.end.toISOString() },
    };

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${externalId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Calendar updateEvent failed: ${err}`);
    }
  }

  async deleteEvent(externalId: string): Promise<void> {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${externalId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${this.accessToken}` },
      }
    );

    // 404 = already deleted — treat as success
    if (!res.ok && res.status !== 404) {
      const err = await res.text();
      throw new Error(`Google Calendar deleteEvent failed: ${err}`);
    }
  }

  async listBusy(userId: string, from: Date, to: Date): Promise<BusySlot[]> {
    const body = {
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      items: [{ id: "primary" }],
    };

    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/freeBusy",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) return [];

    const data = await res.json();
    const busy: Array<{ start: string; end: string }> =
      data?.calendars?.primary?.busy ?? [];

    return busy.map(slot => ({
      start: new Date(slot.start),
      end: new Date(slot.end),
    }));
  }
}
