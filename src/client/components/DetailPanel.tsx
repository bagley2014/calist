import type { Item, Priority } from '@shared/types';
import {
	epochSecondsToDateInputValue,
	epochSecondsToTimeInputValue,
	humanizeRRule,
	localDateTimeToEpochSeconds,
} from '../lib/formatters';
import { useEffect, useState } from 'react';

interface DetailPanelProps {
	item: Item | null;
	onClose: () => void;
	onSave: (itemId: string, updates: Partial<Item>) => Promise<void>;
	onDelete: (itemId: string) => Promise<void>;
	onToggleComplete: (item: Item, completed: boolean) => Promise<void>;
	onSkipNext: (itemId: string) => Promise<void>;
}

const priorities: Priority[] = ['low', 'medium', 'high', 'critical'];

function normalizeRuleText(value: string) {
	return value.trim().replace(/^RRULE:/, '');
}

export function DetailPanel({ item, onClose, onSave, onDelete, onToggleComplete, onSkipNext }: DetailPanelProps) {
	const [title, setTitle] = useState('');
	const [notes, setNotes] = useState('');
	const [priority, setPriority] = useState<Priority>('medium');
	const [startDate, setStartDate] = useState('');
	const [startTime, setStartTime] = useState('');
	const [endDate, setEndDate] = useState('');
	const [endTime, setEndTime] = useState('');
	const [isAllDay, setIsAllDay] = useState(false);
	const [rrule, setRRule] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!item) {
			return;
		}

		setTitle(item.title);
		setNotes(item.notes ?? '');
		setPriority(item.priority);
		setStartDate(epochSecondsToDateInputValue(item.startsAt));
		setStartTime(epochSecondsToTimeInputValue(item.startsAt));
		setEndDate(epochSecondsToDateInputValue(item.endsAt));
		setEndTime(epochSecondsToTimeInputValue(item.endsAt));
		setIsAllDay(item.isAllDay);
		setRRule(item.rrule ?? '');
		setError(null);
	}, [item]);

	if (!item) {
		return null;
	}

	async function runAction(action: () => Promise<void>) {
		setBusy(true);
		try {
			await action();
			setError(null);
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : 'The change could not be saved.');
		} finally {
			setBusy(false);
		}
	}

	return (
		<aside className="detail-panel">
			<div className="detail-panel__head">
				<div>
					<span className="eyebrow">Detail</span>
					<h2>{item.title}</h2>
				</div>
				<button type="button" className="button button--ghost" onClick={onClose}>
					Close
				</button>
			</div>

			<div className="detail-panel__body">
				<label>
					Title
					<input value={title} onChange={(event) => setTitle(event.target.value)} />
				</label>

				<label>
					Notes
					<textarea rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} />
				</label>

				<label>
					Priority
					<select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
						{priorities.map((entry) => (
							<option key={entry} value={entry}>
								{entry}
							</option>
						))}
					</select>
				</label>

				<label className="checkbox-row">
					<input type="checkbox" checked={isAllDay} onChange={(event) => setIsAllDay(event.target.checked)} />
					All day
				</label>

				<div className="detail-panel__grid">
					<label>
						Start date
						<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
					</label>
					{!isAllDay ? (
						<label>
							Start time
							<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
						</label>
					) : null}
					<label>
						End date
						<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
					</label>
					{!isAllDay ? (
						<label>
							End time
							<input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
						</label>
					) : null}
				</div>

				<label>
					Recurrence rule
					<textarea
						rows={3}
						value={rrule}
						onChange={(event) => setRRule(event.target.value)}
						placeholder="FREQ=WEEKLY;BYDAY=MO"
					/>
				</label>
				{rrule ? <p className="detail-panel__hint">{humanizeRRule(normalizeRuleText(rrule))}</p> : null}

				{error ? <p className="inline-message inline-message--error">{error}</p> : null}
			</div>

			<div className="detail-panel__actions">
				<button
					type="button"
					className="button"
					disabled={busy}
					onClick={() =>
						runAction(async () => {
							await onSave(item.id, {
								title: title.trim(),
								notes: notes.trim() || null,
								priority,
								startsAt: localDateTimeToEpochSeconds(startDate, startTime, isAllDay),
								endsAt: localDateTimeToEpochSeconds(endDate, endTime, isAllDay, true),
								isAllDay,
								rrule: normalizeRuleText(rrule) || null,
							});
						})
					}
				>
					Save changes
				</button>
				{item.startsAt === null && (
					<button
						type="button"
						className="button button--ghost"
						disabled={busy}
						onClick={() => runAction(() => onToggleComplete(item, !item.completed))}
					>
						{item.completed ? 'Mark incomplete' : 'Mark complete'}
					</button>
				)}
				{item.rrule ? (
					<button
						type="button"
						className="button button--ghost"
						disabled={busy}
						onClick={() => runAction(() => onSkipNext(item.id))}
					>
						Skip next occurrence
					</button>
				) : null}
				<button
					type="button"
					className="button button--danger"
					disabled={busy}
					onClick={() =>
						runAction(async () => {
							await onDelete(item.id);
							onClose();
						})
					}
				>
					Delete item
				</button>
			</div>
		</aside>
	);
}
