import {
	buildChipSummary,
	dayKeyFromTimestamp,
	formatDayHeading,
	formatWhen,
	humanizeRRule,
	priorityTone,
} from '../lib/formatters';

import type { Item } from '@shared/types';

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
	const visibleItems = items.filter((item) => {
		if (!showCompleted && item.completed) {
			return false;
		}

		if (activeDay && dayKeyFromTimestamp(item.startsAt) !== activeDay) {
			return false;
		}

		return true;
	});

	const undatedItems = visibleItems.filter((item) => item.startsAt === null);
	const datedItems = visibleItems.filter((item) => item.startsAt !== null);
	const groups = datedItems.reduce<Map<string, Item[]>>((map, item) => {
		const key = dayKeyFromTimestamp(item.startsAt);
		const bucket = map.get(key) ?? [];
		bucket.push(item);
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
					{undatedItems.map((item) => (
						<article
							key={item.id}
							className={`item-card ${priorityTone(item.priority)} ${item.completed ? 'item-card--completed' : ''}`}
							onClick={() => onSelectItem(item.id)}
						>
							<div>
								<div className="item-card__title-row">
									<h4>{item.title}</h4>
									{item.rrule ? <span className="item-card__repeat">Repeat</span> : null}
								</div>
								<p>{buildChipSummary(item)}</p>
							</div>
							<button
								type="button"
								className="button button--ghost"
								onClick={(event) => {
									event.stopPropagation();
									onToggleComplete(item, !item.completed);
								}}
							>
								{item.completed ? 'Undo' : 'Done'}
							</button>
						</article>
					))}
				</div>
			) : null}

			{[...groups.entries()].map(([dayKey, groupItems]) => (
				<div className="list-group" key={dayKey}>
					<h3>{formatDayHeading(groupItems[0].startsAt ?? 0)}</h3>
					{groupItems.map((item) => (
						<article
							key={item.id}
							className={`item-card ${priorityTone(item.priority)} ${item.completed ? 'item-card--completed' : ''}`}
							onClick={() => onSelectItem(item.id)}
						>
							<div>
								<div className="item-card__title-row">
									<h4>{item.title}</h4>
									{item.rrule ? <span className="item-card__repeat">Repeat</span> : null}
								</div>
								<p>
									{formatWhen(item.startsAt, item.isAllDay)} · {item.priority}
									{item.rrule ? ` · ${humanizeRRule(item.rrule)}` : ''}
								</p>
							</div>
						</article>
					))}
				</div>
			))}

			{visibleItems.length === 0 ? <div className="empty-state">No items match the current filter.</div> : null}
		</section>
	);
}
