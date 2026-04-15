import {
	dateToLocalDateKey,
	epochSecondsToDateInputValue,
	epochSecondsToDateKey,
	epochSecondsToTimeInputValue,
	localDateTimeToEpochSeconds,
} from './date';
import { describe, expect, it } from 'vitest';

describe('date helpers', () => {
	it('formats local dates and time for inputs', () => {
		const localDate = new Date(2026, 3, 15, 9, 7, 0, 0);
		const timestamp = Math.floor(localDate.getTime() / 1000);

		expect(epochSecondsToDateInputValue(timestamp)).toBe('2026-04-15');
		expect(epochSecondsToTimeInputValue(timestamp)).toBe('09:07');
		expect(epochSecondsToDateKey(timestamp)).toBe('2026-04-15');
	});

	it('returns undated or empty values for null timestamps', () => {
		expect(epochSecondsToDateKey(null)).toBe('undated');
		expect(epochSecondsToDateInputValue(null)).toBe('');
		expect(epochSecondsToTimeInputValue(null)).toBe('');
	});

	it('builds all-day start and end timestamps deterministically', () => {
		const start = localDateTimeToEpochSeconds('2026-04-15', '', true, false);
		const end = localDateTimeToEpochSeconds('2026-04-15', '', true, true);

		expect(start).not.toBeNull();
		expect(end).not.toBeNull();
		expect(end! - start!).toBe(23 * 60 * 60 + 59 * 60);
		expect(epochSecondsToDateInputValue(start)).toBe('2026-04-15');
		expect(epochSecondsToDateInputValue(end)).toBe('2026-04-15');
	});

	it('uses 09:00 default for timed events with no explicit time', () => {
		const timestamp = localDateTimeToEpochSeconds('2026-04-15', '', false, false);
		expect(timestamp).not.toBeNull();
		expect(epochSecondsToTimeInputValue(timestamp)).toBe('09:00');
	});

	it('parses explicit date and time values', () => {
		const timestamp = localDateTimeToEpochSeconds('2026-04-15', '14:45', false, false);
		expect(timestamp).not.toBeNull();
		expect(epochSecondsToDateInputValue(timestamp)).toBe('2026-04-15');
		expect(epochSecondsToTimeInputValue(timestamp)).toBe('14:45');
	});

	it('rejects invalid date and time input', () => {
		expect(localDateTimeToEpochSeconds('not-a-date', '12:30', false)).toBeNull();
		expect(localDateTimeToEpochSeconds('2026-04-15', 'not-a-time', false)).toBeNull();
	});

	it('produces date keys directly from Date objects', () => {
		expect(dateToLocalDateKey(new Date(2026, 0, 2))).toBe('2026-01-02');
	});
});
