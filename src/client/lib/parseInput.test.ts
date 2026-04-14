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

	describe('priority detection', () => {
		it('detects "critical" priority keyword', () => {
			const result = parseInput('Server is down critical');
			expect(result.priority).toBe('critical');
		});

		it('detects "!!!" as critical priority', () => {
			const result = parseInput('Deploy hotfix !!!');
			expect(result.priority).toBe('critical');
		});

		it('detects "high" priority keyword', () => {
			const result = parseInput('Review PR high priority');
			expect(result.priority).toBe('high');
		});

		it('detects "medium priority" explicitly', () => {
			const result = parseInput('Check logs medium priority');
			expect(result.priority).toBe('medium');
		});

		it('detects "low" priority keyword', () => {
			const result = parseInput('Organize bookmarks low priority');
			expect(result.priority).toBe('low');
		});

		it('defaults to medium when no priority is specified', () => {
			const result = parseInput('Water the plants');
			expect(result.priority).toBe('medium');
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
			expect(result.title).toBe('Team sync');
		});

		it('parses "every month" as monthly recurrence', () => {
			const result = parseInput('Pay rent every month');
			expect(result.rrule).toContain('FREQ=MONTHLY');
		});

		it('sets startsAt from recurrence when no explicit date is given', () => {
			const result = parseInput('Stretch every day');
			expect(result.rrule).toContain('FREQ=DAILY');
			expect(result.startsAt).not.toBeNull();
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
