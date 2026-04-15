function pad2(value: number) {
	return String(value).padStart(2, '0');
}

function parseDateValue(dateValue: string) {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
	if (!match) {
		return null;
	}

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);

	if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
		return null;
	}

	return { year, month, day };
}

function parseTimeValue(timeValue: string) {
	const match = /^(\d{2}):(\d{2})$/.exec(timeValue);
	if (!match) {
		return null;
	}

	const hour = Number(match[1]);
	const minute = Number(match[2]);

	if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
		return null;
	}

	return { hour, minute };
}

export function epochSecondsToDate(timestamp: number | null) {
	if (timestamp === null) {
		return null;
	}

	return new Date(timestamp * 1000);
}

export function dateToLocalDateKey(date: Date) {
	return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function epochSecondsToDateKey(timestamp: number | null) {
	if (timestamp === null) {
		return 'undated';
	}

	return dateToLocalDateKey(new Date(timestamp * 1000));
}

export function epochSecondsToDateInputValue(timestamp: number | null) {
	if (timestamp === null) {
		return '';
	}

	return dateToLocalDateKey(new Date(timestamp * 1000));
}

export function epochSecondsToTimeInputValue(timestamp: number | null) {
	if (timestamp === null) {
		return '';
	}

	const date = new Date(timestamp * 1000);
	return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function localDateTimeToEpochSeconds(dateValue: string, timeValue: string, isAllDay: boolean, endOfDay = false) {
	if (!dateValue) {
		return null;
	}

	const parsedDate = parseDateValue(dateValue);
	if (!parsedDate) {
		return null;
	}

	const fallbackTime = isAllDay ? (endOfDay ? '23:59' : '00:00') : timeValue || (endOfDay ? '23:59' : '09:00');
	const parsedTime = parseTimeValue(fallbackTime);
	if (!parsedTime) {
		return null;
	}

	const nextDate = new Date(
		parsedDate.year,
		parsedDate.month - 1,
		parsedDate.day,
		parsedTime.hour,
		parsedTime.minute,
		0,
		0
	);

	if (Number.isNaN(nextDate.getTime())) {
		return null;
	}

	return Math.floor(nextDate.getTime() / 1000);
}
