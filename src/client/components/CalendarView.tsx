import cn from 'classnames';
import { dateToLocalDateKey, epochSecondsToDateKey, getMonthLabel, priorityClass } from '../lib/formatters';
import type { Item } from '@shared/types';
import type { ItemOccurrence } from '../lib/recurrence';
import { expandRecurringItems } from '../lib/recurrence';
import s from './CalendarView.module.less';
import shared from '../shared.module.less';

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
	const occurrences = expandRecurringItems(items, days[0], days[days.length - 1]);
	const itemMap = occurrences.reduce<Map<string, ItemOccurrence[]>>((map, occ) => {
		const key = epochSecondsToDateKey(occ.occurrenceStartsAt);
		if (key === 'undated' || occ.item.completed) {
			return map;
		}
		const bucket = map.get(key) ?? [];
		bucket.push(occ);
		map.set(key, bucket);
		return map;
	}, new Map());

	return (
		<section className={shared.stack}>
			<div className={shared.sectionHead}>
				<div>
					<span className={shared.eyebrow}>Calendar</span>
					<h2>{getMonthLabel(month)}</h2>
				</div>
				<div className={shared.sectionActions}>
					<button type="button" className={cn(shared.button, shared.ghost)} onClick={onPrevMonth}>
						Prev
					</button>
					<button type="button" className={cn(shared.button, shared.ghost)} onClick={onToday}>
						Today
					</button>
					<button type="button" className={cn(shared.button, shared.ghost)} onClick={onNextMonth}>
						Next
					</button>
				</div>
			</div>

			<div className={cn(s.grid, s.gridLabels)}>
				{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
					<div key={label} className={s.label}>
						{label}
					</div>
				))}
			</div>
			<div className={s.grid}>
				{days.map((day) => {
					const key = dateToLocalDateKey(day);
					const dayItems = itemMap.get(key) ?? [];
					const isCurrentMonth = day.getMonth() === month.getMonth();
					return (
						<button
							key={key}
							type="button"
							className={cn(s.day, !isCurrentMonth && s.muted, activeDay === key && s.dayActive)}
							onClick={() => onSelectDay(key)}
						>
							<span className={s.date}>{day.getDate()}</span>
							<div className={s.chips}>
								{dayItems.slice(0, 3).map((occ) => (
									<span
										key={`${occ.item.id}-${occ.occurrenceStartsAt}`}
										className={cn(s.chip, shared[priorityClass(occ.item.priority)])}
										title={occ.item.title}
									>
										{occ.item.title}
									</span>
								))}
								{dayItems.length > 3 ? <span className={cn(s.chip, s.overflow)}>+{dayItems.length - 3}</span> : null}
							</div>
						</button>
					);
				})}
			</div>
		</section>
	);
}
