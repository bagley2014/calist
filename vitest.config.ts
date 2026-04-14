import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
	test: {
		root: resolve(__dirname),
		include: ['src/**/*.test.ts'],
		alias: { '@shared': resolve(__dirname, 'src/shared') },
	},
});
