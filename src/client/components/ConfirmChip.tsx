import './ConfirmChip.less';

import { getWhenLabel, priorityLabel } from '../lib/formatters';

import type { ParsedQuickAdd } from '@shared/types';

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
		<div className="confirm-chip" role="status">
			<span className="confirm-chip__summary">{summary}</span>
			<div className="confirm-chip__actions">
				<button type="button" className="button button--ghost" onClick={onCancel} disabled={busy}>
					Cancel
				</button>
				<button type="button" className="button" onClick={onConfirm} disabled={busy}>
					{busy ? 'Saving...' : 'Confirm'}
				</button>
			</div>
		</div>
	);
}
