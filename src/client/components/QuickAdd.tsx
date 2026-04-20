import { useRef, useState } from 'react';

import { ConfirmChip } from './ConfirmChip';
import type { ParsedQuickAdd } from '@shared/types';
import cn from 'classnames';
import { parseInput } from '../lib/parseInput';
import styles from './QuickAdd.module.less';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';

interface QuickAddProps {
	onCreate: (parsed: ParsedQuickAdd) => Promise<void>;
}

export function QuickAdd({ onCreate }: QuickAddProps) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [draft, setDraft] = useState('');
	const [parsed, setParsed] = useState<ParsedQuickAdd | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [isMobileOpen, setIsMobileOpen] = useState(false);

	useKeyboardShortcut('n', () => {
		setIsMobileOpen(true);
		inputRef.current?.focus();
	});

	function handlePreview() {
		try {
			const nextParsed = parseInput(draft);
			setParsed(nextParsed);
			setError(null);
		} catch (nextError) {
			setParsed(null);
			setError(nextError instanceof Error ? nextError.message : 'Unable to parse input.');
		}
	}

	async function handleConfirm() {
		if (!parsed) {
			return;
		}

		setIsSaving(true);
		try {
			await onCreate(parsed);
			setDraft('');
			setParsed(null);
			setError(null);
			setIsMobileOpen(false);
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : 'Unable to save item.');
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<section className={cn(styles.root, isMobileOpen && styles.open)}>
			<form
				className={styles.bar}
				onSubmit={(event) => {
					event.preventDefault();
					handlePreview();
				}}
			>
				<div className={styles.lead}>
					<span className={styles.badge}>Quick add</span>
					<p>Type naturally: dentist friday 3pm high</p>
				</div>
				<div className={styles.inputRow}>
					<input
						ref={inputRef}
						value={draft}
						onChange={(event) => {
							setDraft(event.target.value);
							setParsed(null);
							setError(null);
						}}
						placeholder="Add an item with time, priority, or recurrence"
						aria-label="Quick add"
					/>
					<button className={styles.button} type="submit">
						Parse
					</button>
				</div>
			</form>

			{error ? <p className={cn(styles.message, styles.messageError)}>{error}</p> : null}
			{parsed ? (
				<ConfirmChip parsed={parsed} onConfirm={handleConfirm} onCancel={() => setParsed(null)} busy={isSaving} />
			) : null}

			<button type="button" className={styles.fab} onClick={() => setIsMobileOpen((current) => !current)}>
				{isMobileOpen ? 'Close' : 'New'}
			</button>
		</section>
	);
}
