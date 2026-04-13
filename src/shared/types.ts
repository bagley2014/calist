export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface Item {
	id: string;
	title: string;
	notes: string | null;
	priority: Priority;
	startsAt: number | null;
	endsAt: number | null;
	isAllDay: boolean;
	rrule: string | null;
	exceptions: number[];
	completed: boolean;
	completedAt: number | null;
	createdAt: number;
	updatedAt: number;
}

export interface SchedulerSettings {
	apiKey: string;
	exportUrl: string;
	lookbackDays: number;
}

export interface ParsedQuickAdd {
	title: string;
	notes: string | null;
	priority: Priority;
	startsAt: number | null;
	endsAt: number | null;
	isAllDay: boolean;
	rrule: string | null;
	recurrenceText: string | null;
}
