import { RRule } from "rrule";
import type { Item, Priority } from "@shared/types";

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const chipFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const allDayFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});

export function priorityLabel(priority: Priority) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function priorityTone(priority: Priority) {
  return `priority-${priority}`;
}

export function formatWhen(startsAt: number | null, isAllDay: boolean) {
  if (startsAt === null) {
    return "Undated";
  }

  return isAllDay ? allDayFormatter.format(new Date(startsAt * 1000)) : chipFormatter.format(new Date(startsAt * 1000));
}

export function formatDayHeading(timestamp: number) {
  return dayFormatter.format(new Date(timestamp * 1000));
}

export function monthLabel(date: Date) {
  return monthFormatter.format(date);
}

export function dayKeyFromTimestamp(timestamp: number | null) {
  if (timestamp === null) {
    return "undated";
  }

  return new Date(timestamp * 1000).toLocaleDateString("sv-SE");
}

export function toDateInputValue(timestamp: number | null) {
  if (timestamp === null) {
    return "";
  }

  return new Date(timestamp * 1000).toLocaleDateString("sv-SE");
}

export function toTimeInputValue(timestamp: number | null) {
  if (timestamp === null) {
    return "";
  }

  return new Date(timestamp * 1000).toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function combineLocalDateTime(dateValue: string, timeValue: string, isAllDay: boolean, endOfDay = false) {
  if (!dateValue) {
    return null;
  }

  const time = isAllDay ? (endOfDay ? "23:59" : "00:00") : timeValue || (endOfDay ? "23:59" : "09:00");
  return Math.floor(new Date(`${dateValue}T${time}:00`).getTime() / 1000);
}

export function humanizeRRule(rrule: string | null) {
  if (!rrule) {
    return null;
  }

  try {
    return RRule.fromString(rrule.replace(/^RRULE:/, "")).toText();
  } catch {
    return rrule;
  }
}

export function buildChipSummary(item: Pick<Item, "title" | "startsAt" | "isAllDay" | "priority" | "rrule">) {
  const parts = [item.title];
  if (item.startsAt !== null) {
    parts.push(formatWhen(item.startsAt, item.isAllDay));
  }
  parts.push(priorityLabel(item.priority));
  const recurrence = humanizeRRule(item.rrule);
  if (recurrence) {
    parts.push(recurrence);
  }
  return parts.join(" · ");
}
