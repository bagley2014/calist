import cn from 'classnames';
import { getWhenLabel, priorityLabel } from '../lib/formatters';
import type { ParsedQuickAdd } from '@shared/types';
import s from './ConfirmChip.module.less';
import shared from '../shared.module.less';

interface ConfirmChipProps {
	parsed: ParsedQuickAdd;
	onConfirm: () => void;
	onCancel: () => void;
	busy: boolean;
}

export function ConfirmChip({ parsed, onConfirm, onCancel, busy }: ConfirmChipProps) {
	const timeSummary =
		parsed.startsAt !== null
			? parsed.endsAt !== null
				? `${getWhenLabel(parsed.startsAt, parsed.isAllDay)} to ${getWhenLabel(parsed.endsAt, parsed.isAllDay)}`
				: getWhenLabel(parsed.startsAt, parsed.isAllDay)
			: null;
	const summary = [parsed.title, timeSummary, priorityLabel(parsed.priority), parsed.recurrenceText]
		.filter(Boolean)
		.join(' · ');

	return (
		<div className={s.root} role="status">
			<span>{summary}</span>
			<div className={s.actions}>
				<button type="button" className={cn(shared.button, shared.ghost)} onClick={onCancel} disabled={busy}>
					Cancel
				</button>
				<button type="button" className={shared.button} onClick={onConfirm} disabled={busy}>
					{busy ? 'Saving...' : 'Confirm'}
				</button>
			</div>
		</div>
	);
}
