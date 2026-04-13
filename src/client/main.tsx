import './styles.css';

import App from './App';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

async function configureServiceWorker() {
	if (!('serviceWorker' in navigator)) {
		return;
	}

	if (import.meta.env.PROD) {
		window.addEventListener('load', () => {
			void navigator.serviceWorker.register('/sw.js');
		});
		return;
	}

	// Dev: stale SW caches can serve old Vite optimized deps and break refresh/HMR.
	const registrations = await navigator.serviceWorker.getRegistrations();
	await Promise.all(registrations.map((registration) => registration.unregister()));

	if ('caches' in window) {
		const keys = await caches.keys();
		await Promise.all(keys.filter((key) => key.startsWith('scheduler-shell-')).map((key) => caches.delete(key)));
	}
}

void configureServiceWorker();

const container = document.getElementById('root');

if (!container) {
	throw new Error('Failed to mount app root.');
}

createRoot(container).render(
	<StrictMode>
		<App />
	</StrictMode>
);
