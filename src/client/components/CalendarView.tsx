import { dayKeyFromTimestamp, monthLabel, priorityTone } from '../lib/formatters';

import type { Item } from '@shared/types';

interface CalendarViewProps {
	items: Item[];
	month: Date;
	activeDay: string | null;
	onPrevMonth: () => void;
	onNextMonth: () => void;
	onToday: () => void;
	onSelectDay: (dayKey: string) => void;
}

function buildCalendarDays(month: Date) {
	const start = new Date(month.getFullYear(), month.getMonth(), 1);
	const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
	const firstGridDay = new Date(start);
	firstGridDay.setDate(start.getDate() - start.getDay());

	const days: Date[] = [];
	for (let index = 0; index < 42; index += 1) {
		const day = new Date(firstGridDay);
		day.setDate(firstGridDay.getDate() + index);
		days.push(day);
	}

	return { days, end };
}

export function CalendarView({
	items,
	month,
	activeDay,
	onPrevMonth,
	onNextMonth,
	onToday,
	onSelectDay,
}: CalendarViewProps) {
	const { days } = buildCalendarDays(month);
	const itemMap = items.reduce<Map<string, Item[]>>((map, item) => {
		const key = dayKeyFromTimestamp(item.startsAt);
		if (key === 'undated' || item.completed) {
			return map;
		}
		const bucket = map.get(key) ?? [];
		bucket.push(item);
		map.set(key, bucket);
		return map;
	}, new Map());

	return (
		<section className="stack">
			<div className="section-head">
				<div>
					<span className="eyebrow">Calendar</span>
					<h2>{monthLabel(month)}</h2>
				</div>
				<div className="section-head__actions">
					<button type="button" className="button button--ghost" onClick={onPrevMonth}>
						Prev
					</button>
					<button type="button" className="button button--ghost" onClick={onToday}>
						Today
					</button>
					<button type="button" className="button button--ghost" onClick={onNextMonth}>
						Next
					</button>
				</div>
			</div>

			<div className="calendar-grid calendar-grid--labels">
				{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
					<div key={label} className="calendar-grid__label">
						{label}
					</div>
				))}
			</div>
			<div className="calendar-grid">
				{days.map((day) => {
					const key = day.toLocaleDateString('sv-SE');
					const dayItems = itemMap.get(key) ?? [];
					const isCurrentMonth = day.getMonth() === month.getMonth();
					return (
						<button
							key={key}
							type="button"
							className={`calendar-day ${isCurrentMonth ? '' : 'calendar-day--muted'} ${activeDay === key ? 'calendar-day--active' : ''}`}
							onClick={() => onSelectDay(key)}
						>
							<span className="calendar-day__date">{day.getDate()}</span>
							<div className="calendar-day__chips">
								{dayItems.slice(0, 3).map((item) => (
									<span key={item.id} className={`calendar-chip ${priorityTone(item.priority)}`} title={item.title}>
										{item.title}
									</span>
								))}
								{dayItems.length > 3 ? (
									<span className="calendar-chip calendar-chip--overflow">+{dayItems.length - 3}</span>
								) : null}
							</div>
						</button>
					);
				})}
			</div>
		</section>
	);
}
