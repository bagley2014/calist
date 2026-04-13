import { useRef, useState } from 'react';

import { ConfirmChip } from './ConfirmChip';
import type { ParsedQuickAdd } from '@shared/types';
import { parseInput } from '../lib/parseInput';
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
		<section className={`quick-add ${isMobileOpen ? 'quick-add--open' : ''}`}>
			<form
				className="quick-add__bar"
				onSubmit={(event) => {
					event.preventDefault();
					handlePreview();
				}}
			>
				<div className="quick-add__lead">
					<span className="quick-add__badge">Quick add</span>
					<p>Type naturally: dentist friday 3pm high</p>
				</div>
				<div className="quick-add__input-row">
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
					<button className="button" type="submit">
						Parse
					</button>
				</div>
			</form>

			{error ? <p className="inline-message inline-message--error">{error}</p> : null}
			{parsed ? (
				<ConfirmChip parsed={parsed} onConfirm={handleConfirm} onCancel={() => setParsed(null)} busy={isSaving} />
			) : null}

			<button type="button" className="quick-add__fab" onClick={() => setIsMobileOpen((current) => !current)}>
				{isMobileOpen ? 'Close' : 'New'}
			</button>
		</section>
	);
}
