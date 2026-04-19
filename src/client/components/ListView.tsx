import './ListView.less';

import {
	buildChipSummary,
	epochSecondsToDateKey,
	getDayHeading,
	getWhenLabel,
	humanizeRRule,
	priorityClass,
} from '../lib/formatters';

import type { Item } from '@shared/types';
import type { ItemOccurrence } from '../lib/recurrence';
import { expandRecurringItems } from '../lib/recurrence';
import { useMemo } from 'react';

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

	return (
		<section className="stack">
			<div className="section-head">
				<div>
					<span className="eyebrow">List</span>
				</div>
				<div className="section-head__actions">
					<button type="button" className="button button--ghost" onClick={onToggleShowCompleted}>
						{showCompleted ? 'Hide completed' : 'Show completed'}
					</button>
					{activeDay ? (
						<button type="button" className="button button--ghost" onClick={onClearDayFilter}>
							Clear day filter
						</button>
					) : null}
				</div>
			</div>

			{undatedItems.length > 0 ? (
				<div className="list-group">
					<h3>To-Do</h3>
					{undatedItems.map((occ) => (
						<article
							key={`${occ.item.id}-undated`}
							className={`item-card ${priorityClass(occ.item.priority)} ${occ.item.completed ? 'item-card--completed' : ''}`}
							onClick={() => onSelectItem(occ.item.id)}
						>
							<div>
								<div className="item-card__title-row">
									<h4>{occ.item.title}</h4>
									{occ.item.rrule ? <span className="item-card__repeat">Repeat</span> : null}
								</div>
								<p>{buildChipSummary(occ.item)}</p>
							</div>
							<button
								type="button"
								className="button button--ghost"
								onClick={(event) => {
									event.stopPropagation();
									onToggleComplete(occ.item, !occ.item.completed);
								}}
							>
								{occ.item.completed ? 'Undo' : 'Done'}
							</button>
						</article>
					))}
				</div>
			) : null}

			{[...groups.entries()].map(([dayKey, groupOccs]) => (
				<div className="list-group" key={dayKey}>
					<h3>{getDayHeading(groupOccs[0].occurrenceStartsAt ?? 0)}</h3>
					{groupOccs.map((occ) => (
						<article
							key={`${occ.item.id}-${occ.occurrenceStartsAt}`}
							className={`item-card ${priorityClass(occ.item.priority)} ${occ.item.completed ? 'item-card--completed' : ''}`}
							onClick={() => onSelectItem(occ.item.id)}
						>
							<div>
								<div className="item-card__title-row">
									<h4>{occ.item.title}</h4>
									{occ.item.rrule ? <span className="item-card__repeat">Repeat</span> : null}
								</div>
								<p>{buildChipSummary(occ.item)}</p>
							</div>
						</article>
					))}
				</div>
			))}

			{visibleOccurrences.length === 0 ? <div className="empty-state">No items match the current filter.</div> : null}
		</section>
	);
}
