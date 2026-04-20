import { getWhenLabel, priorityLabel } from '../lib/formatters';

import type { ParsedQuickAdd } from '@shared/types';
import cn from 'classnames';
import styles from './ConfirmChip.module.less';

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
		<div className={styles.root} role="status">
			<span>{summary}</span>
			<div className={styles.actions}>
				<button type="button" className={cn(styles.button, styles.ghost)} onClick={onCancel} disabled={busy}>
					Cancel
				</button>
				<button type="button" className={styles.button} onClick={onConfirm} disabled={busy}>
					{busy ? 'Saving...' : 'Confirm'}
				</button>
			</div>
		</div>
	);
}
