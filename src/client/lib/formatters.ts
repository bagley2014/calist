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

const fullChipFormatter = new Intl.DateTimeFormat(undefined, {
	month: 'short',
	day: 'numeric',
	hour: 'numeric',
	minute: '2-digit',
});

const shortChipFormatter = new Intl.DateTimeFormat(undefined, {
	hour: 'numeric',
	minute: '2-digit',
});

const allDayFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });

export function priorityLabel(priority: Priority) {
	return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function priorityClass(priority: Priority) {
	return priority;
}

export function getWhenLabel(startsAt: number | null, isAllDay: boolean) {
	if (startsAt === null) {
		return 'Undated';
	}

	const date = epochSecondsToDate(startsAt);
	if (!date) {
		return 'Undated';
	}

	return isAllDay ? allDayFormatter.format(date) : fullChipFormatter.format(date);
}

export function getTimeLabel(startsAt: number | null, isAllDay: boolean) {
	if (startsAt === null) {
		return 'Undated';
	}

	const date = epochSecondsToDate(startsAt);
	if (!date) {
		return 'Undated';
	}

	return isAllDay ? 'All Day' : shortChipFormatter.format(date);
}

export function getDayHeading(timestamp: number) {
	const date = epochSecondsToDate(timestamp);
	if (!date) {
		return 'Undated';
	}

	return dayFormatter.format(date);
}

export function getMonthLabel(date: Date) {
	return monthFormatter.format(date);
}

export {
	dateToLocalDateKey,
	epochSecondsToDateInputValue,
	epochSecondsToDateKey,
	epochSecondsToTimeInputValue,
	localDateTimeToEpochSeconds,
};

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

export function buildChipSummary(
	item: Pick<Item, 'title' | 'startsAt' | 'isAllDay' | 'priority' | 'rrule' | 'endsAt'>
) {
	const parts = [];
	if (item.startsAt !== null) {
		const startTime = getTimeLabel(item.startsAt, item.isAllDay);

		if (item.endsAt !== null) {
			// If the start and end are on the same day, just show the time range. Otherwise, show the end date as well.
			const startDateKey = epochSecondsToDateKey(item.startsAt);
			const endDateKey = epochSecondsToDateKey(item.endsAt);
			const endTime =
				startDateKey === endDateKey
					? getTimeLabel(item.endsAt, item.isAllDay)
					: getWhenLabel(item.endsAt, item.isAllDay);
			parts.push(`${startTime} → ${endTime}`);
		} else {
			parts.push(startTime);
		}
	}
	parts.push(priorityLabel(item.priority));
	const recurrence = humanizeRRule(item.rrule);
	if (recurrence) {
		parts.push(recurrence);
	}
	return parts.join(' · ');
}
