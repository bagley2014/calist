import cn from 'classnames';
import type { Item } from '@shared/types';
import { expandRecurringItems, type ItemOccurrence } from '../lib/recurrence';
import { buildChipSummary, epochSecondsToDateKey, getDayHeading, priorityClass } from '../lib/formatters';
import { useMemo } from 'react';
import styles from './ListView.module.less';

interface ListViewProps {
	items: Item[];
	showCompleted: boolean;
	activeDay: string | null;
	onToggleShowCompleted: () => void;
	onClearDayFilter: () => void;
	onSelectItem: (itemId: string) => void;
	onToggleComplete: (item: Item, completed: boolean) => void;
}

export function ListView({
	items,
	showCompleted,
	activeDay,
	onToggleShowCompleted,
	onClearDayFilter,
	onSelectItem,
	onToggleComplete,
}: ListViewProps) {
	const occurrences = useMemo(() => {
		const today = new Date();
		let windowStart: Date;
		let windowEnd: Date;

		if (activeDay) {
			const [year, month, day] = activeDay.split('-').map(Number);
			windowStart = new Date(year, month - 1, day);
			windowEnd = new Date(year, month - 1, day + 1);
		} else {
			windowStart = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
			windowEnd = new Date(today.getFullYear() + 2, today.getMonth(), today.getDate());
		}

		return expandRecurringItems(items, windowStart, windowEnd);
	}, [items, activeDay]);

	const visibleOccurrences = occurrences.filter((occ) => {
		if (!showCompleted && occ.item.completed) {
			return false;
		}

		if (activeDay && epochSecondsToDateKey(occ.occurrenceStartsAt) !== activeDay) {
			return false;
		}

		return true;
	});

	const undatedItems = visibleOccurrences.filter((occ) => occ.occurrenceStartsAt === null);
	const datedItems = visibleOccurrences
		.filter((occ) => occ.occurrenceStartsAt !== null)
		.sort((a, b) => (a.occurrenceStartsAt ?? 0) - (b.occurrenceStartsAt ?? 0));
	const groups = datedItems.reduce<Map<string, ItemOccurrence[]>>((map, occ) => {
		const key = epochSecondsToDateKey(occ.occurrenceStartsAt);
		const bucket = map.get(key) ?? [];
		bucket.push(occ);
		map.set(key, bucket);
		return map;
	}, new Map());
	const entries = [...groups.entries()];
	if (undatedItems.length > 0) {
		entries.unshift(['To-Do', undatedItems]);
	}

	return (
		<section className={styles.stack}>
			<div className={styles.sectionHead}>
				<div>
					<span className={styles.eyebrow}>List</span>
				</div>
				<div className={styles.sectionActions}>
					<button type="button" className={cn(styles.button, styles.ghost)} onClick={onToggleShowCompleted}>
						{showCompleted ? 'Hide completed' : 'Show completed'}
					</button>
					{activeDay ? (
						<button type="button" className={cn(styles.button, styles.ghost)} onClick={onClearDayFilter}>
							Clear day filter
						</button>
					) : null}
				</div>
			</div>

			{entries.map(([dayKey, groupOccurrences]) => (
				<div className={styles.group} key={dayKey}>
					<div className={styles.dayColumn}>
						<h3>{dayKey === 'To-Do' ? dayKey : getDayHeading(groupOccurrences[0].occurrenceStartsAt!)}</h3>
					</div>
					<div className={styles.eventsColumn}>
						{groupOccurrences.map((occ, idx) => {
							const isLast = idx === groupOccurrences.length - 1;
							return (
								<article
									key={`${occ.item.id}-${occ.occurrenceStartsAt}`}
									className={cn(
										styles.card,
										styles[priorityClass(occ.item.priority)],
										occ.item.completed && styles.completed,
										isLast && styles.lastEvent
									)}
									onClick={() => onSelectItem(occ.item.id)}
								>
									<div>
										<div className={styles.titleRow}>
											<h4>{occ.item.title}</h4>
											{occ.item.rrule ? <span className={styles.repeat}>Repeat</span> : null}
										</div>
										<p>{buildChipSummary(occ.item)}</p>
									</div>
									{dayKey === 'To-Do' ? (
										<button
											type="button"
											className={cn(styles.button, styles.ghost)}
											onClick={(event) => {
												event.stopPropagation();
												onToggleComplete(occ.item, !occ.item.completed);
											}}
										>
											{occ.item.completed ? 'Undo' : 'Done'}
										</button>
									) : null}
								</article>
							);
						})}
					</div>
				</div>
			))}

			{visibleOccurrences.length === 0 ? <div className={styles.empty}>No items match the current filter.</div> : null}
		</section>
	);
}
