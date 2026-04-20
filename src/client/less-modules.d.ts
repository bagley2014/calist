// Fallback type declaration for *.module.less imports before the dev server
// generates precise per-file .d.ts files via vite-plugin-typed-css-modules.
declare module '*.module.less' {
	const classes: Record<string, string>;
	export default classes;
}
