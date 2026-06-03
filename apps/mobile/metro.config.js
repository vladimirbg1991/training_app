const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// pnpm monorepo: watch workspace packages for changes
config.watchFolders = [monorepoRoot];

// pnpm monorepo: resolve node_modules from both app and root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// pnpm monorepo: keep hierarchical lookup ENABLED so Metro can resolve each
// package's nested deps (e.g. react-native-reanimated -> semver) inside the
// .pnpm store. Disabling it breaks pnpm's nested node_modules resolution.
// Symlink following is handled by unstable_enableSymlinks (default true).
config.resolver.disableHierarchicalLookup = false;
config.resolver.unstable_enableSymlinks = true;

// Support package.json "exports" field (used by workspace packages)
config.resolver.unstable_enablePackageExports = true;

// Prefer "source" so Metro resolves raw TypeScript from workspace packages.
// Do NOT list "import": React Native/Hermes is CommonJS-first, and @babel/runtime
// helpers expose only `node`/`import`/`default` conditions (no `require`). Listing
// "import" makes Metro pick the ESM helper, which `require()` returns as
// `{ default: fn }` — an Object — breaking CJS interop and throwing
// `_interopRequireDefault is not a function (it is Object)`. Omitting "import"
// lets resolution fall through to the CJS "default" condition.
config.resolver.unstable_conditionNames = ['source', 'require'];

// // Ensure @clerk packages are transformed through Babel (not skipped)
// // This allows the import.meta polyfill to work in Hermes
// const originalGetTransformOptions = config.transformer.getTransformOptions;
// config.transformer.getTransformOptions = async (entryPoints, options) => {
//   const transformOptions = await originalGetTransformOptions(entryPoints, options);
//   // Don't skip transformation of @clerk packages
//   transformOptions.dev = options.dev;
//   transformOptions.hot = options.hot;
//   return transformOptions;
// };

module.exports = withNativeWind(config, { input: './global.css' });
