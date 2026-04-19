import { describe, expect, it } from 'vitest';

import { parseInput } from './parseInput';

describe('parseInput', () => {
	describe('title extraction', () => {
		it('returns a plain title when no date or priority is given', () => {
			const result = parseInput('Buy groceries');
			expect(result.title).toBe('Buy groceries');
			expect(result.startsAt).toBeNull();
			expect(result.priority).toBe('medium');
		});

		it('throws when input is empty', () => {
			expect(() => parseInput('')).toThrow('Type something to add.');
			expect(() => parseInput('   ')).toThrow('Type something to add.');
		});

		it('throws when only a date is provided with no title', () => {
			expect(() => parseInput('tomorrow')).toThrow('Add a title so this item is recognizable later.');
		});
	});

	describe('date parsing', () => {
		it('parses "tomorrow" as a future date', () => {
			const result = parseInput('Dentist appointment tomorrow');
			expect(result.startsAt).not.toBeNull();
			expect(result.title).toBe('Dentist appointment');
			expect(result.isAllDay).toBe(true);
		});

		it('parses a specific time and sets isAllDay to false', () => {
			const result = parseInput('Standup at 9am tomorrow');
			expect(result.startsAt).not.toBeNull();
			expect(result.isAllDay).toBe(false);
		});

		it('parses "today" as a date', () => {
			const result = parseInput('Finish report today');
			expect(result.startsAt).not.toBeNull();
			expect(result.title).toBe('Finish report');
		});

		it('throws for unresolvable date-like input', () => {
			expect(() => parseInput('meet next')).toThrow("I couldn't resolve that date or time.");
		});
	});

	describe('end date parsing', () => {
		it('parses date ranges and sets endsAt', () => {
			const result = parseInput('Conference from tomorrow to friday');
			expect(result.startsAt).not.toBeNull();
			expect(result.endsAt).not.toBeNull();
			expect(result.endsAt).toBeGreaterThan(result.startsAt!);
		});

		it('sets endsAt to null when no end date is given', () => {
			const result = parseInput('Doctor appointment monday 2pm');
			expect(result.startsAt).not.toBeNull();
			expect(result.endsAt).toBeNull();
		});

		it('sets end times for time ranges', () => {
			const result = parseInput('Meeting tomorrow 3pm-4pm');
			expect(result.startsAt).not.toBeNull();
			expect(result.endsAt).not.toBeNull();
			expect(result.endsAt).toBe(result.startsAt! + 3600);
		});
	});

	describe('priority detection', () => {
		it('detects "critical" priority keyword', () => {
			const result = parseInput('Server is down critical');
			expect(result.priority).toBe('critical');
			expect(result.title).toBe('Server is down');
		});

		it('detects "!!!" as critical priority', () => {
			const result = parseInput('Deploy hotfix !!!');
			expect(result.priority).toBe('critical');
			expect(result.title).toBe('Deploy hotfix');
		});

		it('detects "high" priority keyword', () => {
			const result = parseInput('Review PR high priority');
			expect(result.priority).toBe('high');
			expect(result.title).toBe('Review PR');
		});

		it('detects "medium priority" explicitly', () => {
			const result = parseInput('Check logs medium priority');
			expect(result.priority).toBe('medium');
			expect(result.title).toBe('Check logs');
		});

		it('detects "low" priority keyword', () => {
			const result = parseInput('Organize bookmarks low priority');
			expect(result.priority).toBe('low');
			expect(result.title).toBe('Organize bookmarks');
		});

		it('defaults to medium when no priority is specified', () => {
			const result = parseInput('Water the plants');
			expect(result.priority).toBe('medium');
			expect(result.title).toBe('Water the plants');
		});
	});

	describe('recurrence', () => {
		it('parses "every day" as a daily recurrence', () => {
			const result = parseInput('Take vitamins every day');
			expect(result.rrule).not.toBeNull();
			expect(result.rrule).toContain('FREQ=DAILY');
			expect(result.recurrenceText).not.toBeNull();
			expect(result.title).toBe('Take vitamins');
		});

		it('parses "every week" as a weekly recurrence', () => {
			const result = parseInput('Team sync every week');
			expect(result.rrule).toContain('FREQ=WEEKLY');
			expect(result.recurrenceText).not.toBeNull();
			expect(result.title).toBe('Team sync');
		});

		it('parses "every month" as monthly recurrence', () => {
			const result = parseInput('Pay rent every month');
			expect(result.rrule).toContain('FREQ=MONTHLY');
			expect(result.recurrenceText).not.toBeNull();
			expect(result.title).toBe('Pay rent');
		});

		it('parses "every year" as a yearly recurrence', () => {
			const result = parseInput('Birthday every year');
			expect(result.rrule).toContain('FREQ=YEARLY');
			expect(result.recurrenceText).not.toBeNull();
			expect(result.title).toBe('Birthday');
			expect(result.startsAt).not.toBeNull();
			expect(result.isAllDay).toBe(true);
		});

		it('parses "every Monday" as a weekly recurrence with BYDAY', () => {
			const result = parseInput('Standup every Monday');
			expect(result.rrule).not.toBeNull();
			expect(result.rrule).toContain('FREQ=WEEKLY');
			expect(result.rrule).toContain('BYDAY=MO');
			expect(result.startsAt).not.toBeNull();
			expect(result.isAllDay).toBe(true);
			expect(result.title).toBe('Standup');
		});

		it('parses "every weekday" as weekdays (Mon-Fri)', () => {
			const result = parseInput('Office hours every weekday');
			expect(result.rrule).not.toBeNull();
			expect(result.rrule).toContain('FREQ=WEEKLY');
			// Expect BYDAY to include Monday and Friday at minimum
			expect(result.rrule).toMatch(/BYDAY=.*MO.*FR|BYDAY=.*MO,.*FR/);
			expect(result.title).toBe('Office hours');
		});

		it('parses multiple weekdays ("Monday and Thursday")', () => {
			const result = parseInput('Gym every Monday and Thursday');
			expect(result.rrule).not.toBeNull();
			expect(result.rrule).toContain('FREQ=WEEKLY');
			// BYDAY may list days in a comma-separated list
			expect(result.rrule).toMatch(/BYDAY=.*MO.*TH|BYDAY=.*MO,.*TH/);
			expect(result.title).toBe('Gym');
		});

		it('sets startsAt from recurrence when no explicit date is given', () => {
			const result = parseInput('Stretch every day');
			expect(result.rrule).toContain('FREQ=DAILY');
			expect(result.startsAt).not.toBeNull();
			expect(result.title).toBe('Stretch');
		});

		it('parses "daily at 3pm" with explicit time', () => {
			const result = parseInput('Standup daily at 3pm');
			expect(result.rrule).not.toBeNull();
			expect(result.rrule).toContain('FREQ=DAILY');
			expect(result.isAllDay).toBe(false);
			expect(result.startsAt).not.toBeNull();
			expect(result.title).toBe('Standup');
		});

		it('parses "every Monday 9am" as weekly with BYDAY and time', () => {
			const result = parseInput('Team sync every Monday 9am');
			expect(result.rrule).not.toBeNull();
			expect(result.rrule).toContain('FREQ=WEEKLY');
			expect(result.rrule).toContain('BYDAY=MO');
			expect(result.isAllDay).toBe(false);
			expect(result.startsAt).not.toBeNull();
			expect(result.title).toBe('Team sync');
		});

		it('parses time before recurrence ("3pm daily")', () => {
			const result = parseInput('Meeting 3pm daily');
			expect(result.rrule).not.toBeNull();
			expect(result.rrule).toContain('FREQ=DAILY');
			expect(result.isAllDay).toBe(false);
			expect(result.startsAt).not.toBeNull();
			expect(result.title).toBe('Meeting');
		});

		it('parses "every 2 weeks" as a biweekly recurrence', () => {
			const result = parseInput('Yoga class every 2 weeks');
			expect(result.rrule).not.toBeNull();
			expect(result.rrule).toContain('FREQ=WEEKLY');
			expect(result.rrule).toContain('INTERVAL=2');
			expect(result.recurrenceText).toBe('every 2 weeks');
			expect(result.title).toBe('Yoga class');
		});

		it('parses "every other week" as a biweekly recurrence', () => {
			const result = parseInput('Yoga class every other week');
			expect(result.rrule).not.toBeNull();
			expect(result.rrule).toContain('FREQ=WEEKLY');
			expect(result.rrule).toContain('INTERVAL=2');
			expect(result.recurrenceText).toBe('every 2 weeks');
			expect(result.title).toBe('Yoga class');
		});

		it('parses "every other Tuesday" as a biweekly recurrence on Tuesdays', () => {
			const result = parseInput('Yoga class every other Tuesday');
			expect(result.rrule).not.toBeNull();
			expect(result.rrule).toContain('FREQ=WEEKLY');
			expect(result.rrule).toContain('INTERVAL=2');
			expect(result.rrule).toContain('BYDAY=TU');
			expect(result.recurrenceText).toBe('every 2 weeks on Tuesday');
			expect(result.title).toBe('Yoga class');
		});

		it('parses "every three months" as a quarterly recurrence', () => {
			const result = parseInput('Pay quarterly taxes every three months');
			expect(result.rrule).not.toBeNull();
			expect(result.rrule).toContain('FREQ=MONTHLY');
			expect(result.rrule).toContain('INTERVAL=3');
			expect(result.recurrenceText).toBe('every 3 months');
			expect(result.title).toBe('Pay quarterly taxes');
		});

		it('parses "every other month" as a bi-monthly recurrence', () => {
			const result = parseInput('Pay rent every other month');
			expect(result.rrule).not.toBeNull();
			expect(result.rrule).toContain('FREQ=MONTHLY');
			expect(result.rrule).toContain('INTERVAL=2');
			expect(result.recurrenceText).toBe('every 2 months');
			expect(result.title).toBe('Pay rent');
		});

		it('parses "every weekday" as a weekly recurrence on weekdays', () => {
			const result = parseInput('Check emails every weekday');
			expect(result.rrule).not.toBeNull();
			expect(result.rrule).toContain('FREQ=WEEKLY');
			expect(result.rrule).toContain('BYDAY=MO,TU,WE,TH,FR');
			expect(result.recurrenceText).toBe('every weekday');
			expect(result.title).toBe('Check emails');
		});
	});

	describe('combined parsing', () => {
		it('extracts date, priority, and title together', () => {
			const result = parseInput('Submit taxes tomorrow high priority');
			expect(result.title).toBe('Submit taxes');
			expect(result.startsAt).not.toBeNull();
			expect(result.priority).toBe('high');
			expect(result.isAllDay).toBe(true);
		});

		it('handles recurrence with a specific date', () => {
			const result = parseInput('Water plants every week tomorrow');
			expect(result.rrule).toContain('FREQ=WEEKLY');
			expect(result.startsAt).not.toBeNull();
		});

		it('parses recurrence with priority when no explicit date is given', () => {
			const result = parseInput('Standup every day high priority');
			expect(result.rrule).not.toBeNull();
			expect(result.rrule).toContain('FREQ=DAILY');
			expect(result.priority).toBe('high');
			expect(result.title).toBe('Standup');
			expect(result.startsAt).not.toBeNull();
		});

		it('parses recurrence with explicit date and priority', () => {
			const result = parseInput('Team sync every week tomorrow critical');
			expect(result.rrule).toContain('FREQ=WEEKLY');
			expect(result.priority).toBe('critical');
			expect(result.startsAt).not.toBeNull();
			expect(result.title).toBe('Team sync');
		});

		it('throws for ambiguous date + recurrence anchors', () => {
			expect(() => parseInput('Team sync every Monday 4/19/26')).toThrow();
		});
	});

	describe('output shape', () => {
		it('always includes all expected fields', () => {
			const result = parseInput('Simple task');
			expect(result).toHaveProperty('title');
			expect(result).toHaveProperty('notes', null);
			expect(result).toHaveProperty('priority');
			expect(result).toHaveProperty('startsAt');
			expect(result).toHaveProperty('endsAt');
			expect(result).toHaveProperty('isAllDay');
			expect(result).toHaveProperty('rrule');
			expect(result).toHaveProperty('recurrenceText');
		});

		it('sets endsAt when a date range is parsed', () => {
			const result = parseInput('Conference from tomorrow to friday');
			// endsAt depends on chrono parsing the range; if it does, it should be set
			if (result.endsAt !== null) {
				expect(result.endsAt).toBeGreaterThan(result.startsAt!);
			}
		});
	});
});
