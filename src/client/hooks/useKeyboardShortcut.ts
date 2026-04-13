import { useEffect } from 'react';

function isEditableTarget(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) {
		return false;
	}

	return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function useKeyboardShortcut(key: string, handler: () => void) {
	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.key.toLowerCase() !== key.toLowerCase()) {
				return;
			}

			if (event.metaKey || event.ctrlKey || event.altKey || isEditableTarget(event.target)) {
				return;
			}

			event.preventDefault();
			handler();
		}

		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [handler, key]);
}
