import { useEffect, useRef, useState } from 'react';

import cn from 'classnames';
import styles from './Toast.module.less';

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
		<div className={cn(styles.root, visible && styles.visible)} role="status" aria-live="polite">
			<div className={styles.body}>
				<span className={styles.text}>{message}</span>
				<button type="button" className={cn(styles.button, styles.ghost, styles.dismiss)} onClick={handleDismiss}>
					Dismiss
				</button>
			</div>
			<div className={styles.progress} style={{ animationDuration: `${duration}ms` }} />
		</div>
	);
}
