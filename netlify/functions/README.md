# Netlify Functions

**Canonical source: `netlify/functions/*.ts`**

All functions are TypeScript files bundled at deploy time by esbuild (see `netlify.toml`).

**Do not commit `.zip` artifacts.** Pre-built zips and `manifest.json` are gitignored.
If `manifest.json` appears on disk after a Netlify CLI build, delete it — the `.ts` sources
are the source of truth and will be bundled fresh on every deploy.
