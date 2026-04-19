import * as chrono from 'chrono-node';

import type { ParsedQuickAdd, Priority } from '@shared/types';

import { RRule } from 'rrule';

const dateIntentPattern =
	/\b(today|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|am|pm|next|this|weekend|in\s+\d+)\b/i;
function throwIfDateLanguageIsInInput(input: string) {
	if (dateIntentPattern.test(input)) {
		throw new Error("I couldn't resolve that date or time.");
	}
}

const priorityPatterns: Array<{ priority: Priority; pattern: RegExp }> = [
	{ priority: 'critical', pattern: /(?:\bcritical\b(\s+priority)?|!!!|!!\b)/i },
	{ priority: 'high', pattern: /(?:\bhigh\b(\s+priority)?|!\b)/i },
	{ priority: 'low', pattern: /\blow\b(\s+priority)?/i },
	{ priority: 'medium', pattern: /\bmedium\b(\s+priority)?/i },
];

const recurrencePattern = /\b(every\s+.+|daily|weekly|monthly|yearly)\b/i;

const recurrenceReplacements = [
	{ find: 'daily', replace: 'every day' },
	{ find: 'weekly', replace: 'every week' },
	{ find: 'monthly', replace: 'every month' },
	{ find: 'yearly', replace: 'every year' },
	{ find: 'other', replace: '2' },
	{ find: 'two', replace: '2' },
	{ find: 'three', replace: '3' },
	{ find: 'four', replace: '4' },
	{ find: 'five', replace: '5' },
	{ find: 'six', replace: '6' },
	{ find: 'seven', replace: '7' },
	{ find: 'eight', replace: '8' },
	{ find: 'nine', replace: '9' },
	{ find: 'ten', replace: '10' },
];

export function parseInput(input: string): ParsedQuickAdd {
	const trimmed = input.trim();
	if (!trimmed) {
		throw new Error('Type something to add.');
	}

	// Determine start and end times
	const now = new Date();
	const parsedResults = chrono.parse(trimmed, now, { forwardDate: true });
	const dateResult = parsedResults[0] ?? null;
	let startsAt = dateResult ? Math.floor(dateResult.start.date().getTime() / 1000) : null;
	let endsAt = dateResult?.end ? Math.floor(dateResult.end.date().getTime() / 1000) : null;
	let isAllDay = dateResult ? !(dateResult.start.isCertain('hour') || dateResult.start.isCertain('minute')) : false;

	// Determine priority
	const detectedPriority = priorityPatterns.find(({ pattern }) => pattern.test(trimmed))?.priority ?? 'medium';

	// Determine recurrence
	const recurrenceMatch = trimmed.match(recurrencePattern);

	let recurrenceRule: string | null = null;
	let recurrenceText: string | null = null;

	if (recurrenceMatch) {
		let recurrenceSource = recurrenceMatch[0].trim();

		for (const { find, replace } of recurrenceReplacements) {
			recurrenceSource = recurrenceSource.replace(new RegExp(`\\b${find}\\b`, 'i'), replace);
		}

		try {
			const options = RRule.parseText(recurrenceSource);
			if (options && typeof options.freq === 'number') {
				const dtstart = startsAt ? new Date(startsAt * 1000) : now;
				const rule = new RRule({ ...options, dtstart });
				recurrenceRule =
					rule
						.toString()
						.split('\n')
						.find((line) => line.startsWith('RRULE:'))
						?.replace(/^RRULE:/, '') ?? null;
				recurrenceText = RRule.fromString(recurrenceRule ?? rule.toString()).toText();

				const firstOccurrence = rule.after(new Date(Date.now() - 1000), true);
				if (firstOccurrence) {
					// If no explicit start date, use the first recurrence date.
					if (!startsAt) {
						startsAt = Math.floor(firstOccurrence.getTime() / 1000);
						isAllDay = !/\b\d{1,2}(:\d{2})?\s?(am|pm)\b/i.test(recurrenceSource);
					}
					// If the first occurrence doesn't match the parsed start date, throw an error to avoid confusion.
					else if (Math.abs(firstOccurrence.getTime() / 1000 - startsAt) > 60) {
						startsAt = null;
						throw new Error('The recurrence pattern you entered conflicts with the date you entered.');
					}
				}
			}
		} catch {
			// On parse failure, clear recurrence fields.
			recurrenceRule = null;
			recurrenceText = null;
		}
	}

	if (!startsAt && !recurrenceRule) {
		throwIfDateLanguageIsInInput(trimmed);
	}

	// Determine title by removing detected date, priority, and recurrence parts from the input.
	let title = trimmed;
	if (recurrenceMatch) {
		title = title.replace(recurrenceMatch[0], ' ');
	}
	if (dateResult) {
		title = title.replace(dateResult.text, ' ');
	}
	for (const { pattern } of priorityPatterns) {
		title = title.replace(pattern, ' ');
	}
	title = title.replace(/\s+/g, ' ').trim();

	if (!title) {
		throw new Error('Add a title so this item is recognizable later.');
	}

	return {
		title,
		notes: null,
		priority: detectedPriority,
		startsAt,
		endsAt,
		isAllDay,
		rrule: recurrenceRule,
		recurrenceText,
	};
}
