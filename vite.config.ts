/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
	plugins: [react()],
	root: resolve(__dirname, 'src/client'),
	publicDir: resolve(__dirname, 'public'),
	build: { outDir: resolve(__dirname, 'dist/client'), emptyOutDir: true },
	resolve: { alias: { '@shared': resolve(__dirname, 'src/shared') } },
	server: {
		host: '0.0.0.0',
		port: 5173,
		proxy: {
			'/api': {
				target: 'http://127.0.0.1:3100',
				changeOrigin: true,
			},
		},
	},
});
