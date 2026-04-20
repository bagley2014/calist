import cn from 'classnames';
import type { Item, Priority } from '@shared/types';
import {
	epochSecondsToDateInputValue,
	epochSecondsToTimeInputValue,
	humanizeRRule,
	localDateTimeToEpochSeconds,
} from '../lib/formatters';
import { useEffect, useState } from 'react';
import s from './DetailPanel.module.less';
import shared from '../shared.module.less';

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
	const [showRRuleEditor, setShowRRuleEditor] = useState(false);
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
		<aside className={s.root}>
			<div className={s.head}>
				<div>
					<span className={shared.eyebrow}>Detail</span>
					<h2>{item.title}</h2>
				</div>
				<button type="button" className={cn(shared.button, shared.ghost)} onClick={onClose}>
					Close
				</button>
			</div>

			<div className={s.body}>
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

				<label className={s.checkboxRow}>
					<input type="checkbox" checked={isAllDay} onChange={(event) => setIsAllDay(event.target.checked)} />
					All day
				</label>

				<div className={s.grid}>
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
					<button
						type="button"
						className={s.editToggle}
						aria-expanded={showRRuleEditor}
						onClick={() => setShowRRuleEditor((v) => !v)}
					>
						{showRRuleEditor ? 'done' : 'edit'}
					</button>
					{rrule ? <p className={s.hint}>{humanizeRRule(normalizeRuleText(rrule))}</p> : null}
					{showRRuleEditor ? (
						<textarea
							rows={3}
							value={rrule}
							onChange={(event) => setRRule(event.target.value)}
							placeholder="FREQ=WEEKLY;BYDAY=MO"
						/>
					) : null}
				</label>

				{error ? <p className={cn(shared.message, shared.messageError)}>{error}</p> : null}
			</div>

			<div className={s.actions}>
				<button
					type="button"
					className={shared.button}
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
						className={cn(shared.button, shared.ghost)}
						disabled={busy}
						onClick={() => runAction(() => onToggleComplete(item, !item.completed))}
					>
						{item.completed ? 'Mark incomplete' : 'Mark complete'}
					</button>
				)}
				{item.rrule ? (
					<button
						type="button"
						className={cn(shared.button, shared.ghost)}
						disabled={busy}
						onClick={() => runAction(() => onSkipNext(item.id))}
					>
						Skip next occurrence
					</button>
				) : null}
				<button
					type="button"
					className={cn(shared.button, shared.danger)}
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
