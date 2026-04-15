import type { Item, Priority } from '@shared/types';
import {
	dateToLocalDateKey,
	epochSecondsToDate,
	epochSecondsToDateInputValue,
	epochSecondsToDateKey,
	epochSecondsToTimeInputValue,
	localDateTimeToEpochSeconds,
} from './date';

import { RRule } from 'rrule';

const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

const chipFormatter = new Intl.DateTimeFormat(undefined, {
	month: 'short',
	day: 'numeric',
	hour: 'numeric',
	minute: '2-digit',
});

const allDayFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });

export function priorityLabel(priority: Priority) {
	return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function priorityClass(priority: Priority) {
	return `priority-${priority}`;
}

export function formatWhenLabel(startsAt: number | null, isAllDay: boolean) {
	if (startsAt === null) {
		return 'Undated';
	}

	const date = epochSecondsToDate(startsAt);
	if (!date) {
		return 'Undated';
	}

	return isAllDay ? allDayFormatter.format(date) : chipFormatter.format(date);
}

export function formatDayHeading(timestamp: number) {
	const date = epochSecondsToDate(timestamp);
	if (!date) {
		return 'Undated';
	}

	return dayFormatter.format(date);
}

export function monthLabel(date: Date) {
	return monthFormatter.format(date);
}

export {
	dateToLocalDateKey,
	epochSecondsToDateInputValue,
	epochSecondsToDateKey,
	epochSecondsToTimeInputValue,
	localDateTimeToEpochSeconds,
};

// Backward-compatible aliases while call sites migrate.
export const priorityTone = priorityClass;
export const formatWhen = formatWhenLabel;
export const dayKeyFromTimestamp = epochSecondsToDateKey;
export const toDateInputValue = epochSecondsToDateInputValue;
export const toTimeInputValue = epochSecondsToTimeInputValue;
export const combineLocalDateTime = localDateTimeToEpochSeconds;

export function humanizeRRule(rrule: string | null) {
	if (!rrule) {
		return null;
	}

	try {
		return RRule.fromString(rrule.replace(/^RRULE:/, '')).toText();
	} catch {
		return rrule;
	}
}

export function buildChipSummary(item: Pick<Item, 'title' | 'startsAt' | 'isAllDay' | 'priority' | 'rrule'>) {
	const parts = [item.title];
	if (item.startsAt !== null) {
		parts.push(formatWhenLabel(item.startsAt, item.isAllDay));
	}
	parts.push(priorityLabel(item.priority));
	const recurrence = humanizeRRule(item.rrule);
	if (recurrence) {
		parts.push(recurrence);
	}
	return parts.join(' · ');
}
