import type { Item } from '@shared/types';
import { RRule } from 'rrule';

export interface ItemOccurrence {
	item: Item;
	occurrenceStartsAt: number | null;
}

/**
 * Expands recurring items into individual occurrences within [windowStart, windowEnd].
 * Non-recurring items pass through unchanged with their original startsAt.
 * Recurring items with a null startsAt are also passed through unchanged (no anchor to expand from).
 * Exceptions stored in item.exceptions are filtered out.
 */
export function expandRecurringItems(items: Item[], windowStart: Date, windowEnd: Date): ItemOccurrence[] {
	const itemOccurrences: ItemOccurrence[] = [];

	for (const item of items) {
		if (!item.rrule || item.startsAt === null) {
			itemOccurrences.push({ item, occurrenceStartsAt: item.startsAt });
			continue;
		}

		try {
			const options = RRule.parseString(item.rrule);
			const rule = new RRule({ ...options, dtstart: new Date(item.startsAt * 1000) });
			const dates = rule.between(windowStart, windowEnd, true);

			for (const date of dates) {
				const ts = Math.floor(date.getTime() / 1000);
				if (!item.exceptions.includes(ts)) {
					itemOccurrences.push({ item, occurrenceStartsAt: ts });
				}
			}
		} catch {
			// If the rrule can't be parsed, fall back to showing the anchor date.
			itemOccurrences.push({ item, occurrenceStartsAt: item.startsAt });
		}
	}

	const result: ItemOccurrence[] = [];

	for (const occ of itemOccurrences) {
		result.push(occ);

		if (occ.item.isAllDay && occ.item.endsAt && occ.occurrenceStartsAt) {
			const startDate = new Date(occ.occurrenceStartsAt * 1000);
			const endDate = new Date(occ.item.endsAt * 1000);
			const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

			for (let i = 1; i <= dayCount; i++) {
				const nextDay = new Date(startDate);
				nextDay.setDate(startDate.getDate() + i);
				result.push({ item: occ.item, occurrenceStartsAt: Math.floor(nextDay.getTime() / 1000) });
			}
		}
	}

	return result;
}
