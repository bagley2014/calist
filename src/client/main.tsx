import './styles.css';

import App from './App';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		void navigator.serviceWorker.register('/sw.js');
	});
}

const container = document.getElementById('root');

if (!container) {
	throw new Error('Failed to mount app root.');
}

createRoot(container).render(
	<StrictMode>
		<App />
	</StrictMode>
);
