import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tsParser from '@typescript-eslint/parser';
import svelteParser from 'svelte-eslint-parser';

// Keeps this package self-contained, so it can be shared by apps and moved to its own
// repository: nothing may be imported from outside the package, from an app's aliases, or
// (in src/lib) from an app's environment or runtime.

const PACKAGE_ROOT = path.dirname(fileURLToPath(import.meta.url));

// Module aliases and package names that belong to the apps using this package
const APP_MODULES = [/^\$config$/, /^\$theme$/, /^shlips(\/|$)/, /^odh-app(\/|$)/];
// SvelteKit modules that read app state or config; library code takes these as props/options
const APP_RUNTIME_MODULES = [/^\$env\//, /^\$app\//];

function isLibraryFile(filename) {
	const relative = path.relative(PACKAGE_ROOT, filename).split(path.sep).join('/');
	return relative.startsWith('src/lib/');
}

/** @type {import('eslint').Rule.RuleModule} */
const packageBoundary = {
	meta: {
		type: 'problem',
		docs: { description: 'Keep odh-autocoder independent of the apps that use it' },
		schema: []
	},
	create(context) {
		const filename = context.filename ?? context.getFilename();
		const library = isLibraryFile(filename);

		function check(node, source) {
			if (typeof source !== 'string') {
				return;
			}
			let reason;
			if (source.startsWith('.')) {
				const target = path.resolve(path.dirname(filename), source);
				const relative = path.relative(PACKAGE_ROOT, target);
				if (relative.startsWith('..') || path.isAbsolute(relative)) {
					reason = 'it is outside the odh-autocoder package';
				}
			} else if (path.isAbsolute(source)) {
				reason = 'absolute paths may point outside the package';
			} else if (APP_MODULES.some((pattern) => pattern.test(source))) {
				reason = 'it belongs to an app that uses this package';
			} else if (library && APP_RUNTIME_MODULES.some((pattern) => pattern.test(source))) {
				reason = 'library code must take app config and state as props or options';
			}
			if (reason) {
				context.report({ node, message: `Do not import '${source}': ${reason}.` });
			}
		}

		return {
			ImportDeclaration: (node) => check(node.source, node.source.value),
			ExportNamedDeclaration: (node) => node.source && check(node.source, node.source.value),
			ExportAllDeclaration: (node) => check(node.source, node.source.value),
			ImportExpression: (node) =>
				node.source.type === 'Literal' && check(node.source, node.source.value)
		};
	}
};

const boundaries = {
	plugins: { 'odh-autocoder': { rules: { 'package-boundary': packageBoundary } } },
	rules: { 'odh-autocoder/package-boundary': 'error' }
};

export default [
	{
		ignores: ['dist/', '.svelte-kit/', 'node_modules/']
	},
	{
		files: ['**/*.{js,ts}'],
		languageOptions: { parser: tsParser, sourceType: 'module' },
		...boundaries
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: { parser: tsParser }
		},
		...boundaries
	}
];
