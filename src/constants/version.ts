// Build-time version info injected by Vite's `define` config.
// Values are replaced at build time with git metadata.
// In local dev, they fall back to sensible defaults.

export const APP_COMMIT = import.meta.env.VITE_APP_COMMIT || 'dev';
export const APP_BRANCH = import.meta.env.VITE_APP_BRANCH || 'local';
export const APP_BUILD_TIME = import.meta.env.VITE_APP_BUILD_TIME || new Date().toISOString();
export const GITHUB_REPO = 'https://github.com/revolverocelot1/anemoia-frontend';
