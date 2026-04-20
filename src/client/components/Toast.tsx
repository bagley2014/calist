import cn from 'classnames';
import { useEffect, useRef, useState } from 'react';
import s from './Toast.module.less';
import shared from '../shared.module.less';

interface ToastProps {
	message: string;
	duration?: number;
	onDismiss: () => void;
}

export function Toast({ message, duration = 4000, onDismiss }: ToastProps) {
	const [visible, setVisible] = useState(true);
	const timerRef = useRef<number | null>(null);

	useEffect(() => {
		setVisible(true);
		if (timerRef.current) {
			window.clearTimeout(timerRef.current);
		}

		timerRef.current = window.setTimeout(() => {
			setVisible(false);
			timerRef.current = window.setTimeout(onDismiss, 200);
		}, duration);

		return () => {
			if (timerRef.current) {
				window.clearTimeout(timerRef.current);
			}
		};
	}, [message, duration, onDismiss]);

	function handleDismiss() {
		if (timerRef.current) {
			window.clearTimeout(timerRef.current);
		}
		setVisible(false);
		window.setTimeout(onDismiss, 200);
	}

	return (
		<div className={cn(s.root, visible && s.visible)} role="status" aria-live="polite">
			<div className={s.body}>
				<span className={s.text}>{message}</span>
				<button type="button" className={cn(shared.button, shared.ghost, s.dismiss)} onClick={handleDismiss}>
					Dismiss
				</button>
			</div>
			<div className={s.progress} style={{ animationDuration: `${duration}ms` }} />
		</div>
	);
}
