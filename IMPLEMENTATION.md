# ASC 606 Training Hub — Implementation log

## Status
[x] Phase 1 — Scaffold
[x] Phase 2 — Landing page
[x] Phase 3 — Manual content (10 modules)
[x] Phase 4 — Worksheet component
[x] Phase 5 — Close tracker
[x] Phase 6 — Examples
[x] Phase 7 — Build confirmed green

## Completed tasks

### Phase 1 — Scaffold
- 1.1: Docusaurus could not be scaffolded via `create-docusaurus` (directory already existed). All scaffold files created manually instead.
- 1.2: No default tutorial/ or blog/ directories to remove (manual scaffold).
- 1.3: `npm install` completed. Upgraded from 3.7.0 → 3.10.0 due to ProgressPlugin/webpack compatibility error.
- 1.4: Full directory structure created: `docs/manual/`, `docs/tools/`, `docs/examples/`, `src/components/Worksheet/`, `src/components/CloseTracker/`.
- 1.5: `vercel.json` and `docusaurus.config.ts` created per spec.
- 1.6: `sidebars.ts` created. Note: Docusaurus strips numeric prefixes (`01-`) from document IDs and URLs — sidebars and navbar links use unprefixed IDs (e.g., `manual/introduction`, not `manual/01-introduction`).
- 1.7: `src/css/custom.css` with all brand tokens.
- 1.8: `static/img/logo.svg` — white "ASC 606" SVG text.
- 1.9: `npm run build` — green.

### Phase 2 — Landing page
- 2.1: `src/pages/index.tsx` with hero, three feature cards, compliance callout. CSS modules in `index.module.css`.

### Phase 3 — Training manual
- 3.1–3.10: All 10 MDX modules created with frontmatter, admonitions, tables, numbered lists, and Key takeaways sections.
- 3.11: `docs/intro.md` orientation page.
- 3.12: `docs/manual/_category_.json` (also `tools/` and `examples/`).
- 3.13: Build confirmed green.

### Phase 4 — Worksheet component
- 4.1–4.7: `src/components/Worksheet/index.tsx` — 8-tab ASC 606 five-step worksheet. All state via `useState`/`useMemo`. TypeScript strict. All interfaces defined. `loadSample` function implemented. Wrapped in `BrowserOnly` in MDX page.

### Phase 5 — Close tracker
- 5.1–5.9: `src/components/CloseTracker/index.tsx` — 7-tab month-end close tracker. Subledger flows into Dashboard, JE-01, JE-02, and Reconciliation via derived state. JE balance validation (DR = CR). 27-item checklist across 7 sections. `loadSampleData` implemented. Wrapped in `BrowserOnly` in MDX page.

### Phase 6 — Compliance examples
- 6.1–6.4: Five compliant scenarios and two non-compliant scenarios with full five-step analysis, admonition formatting, and closing comparison table.

### Phase 7 — Build confirmed
- 7.1: `npm run build` — zero errors, zero broken links.
- 7.2–7.5: See deploy instructions below.

## Deviations from brief

1. **create-docusaurus skipped** — directory pre-existed; all scaffold files created manually. Functionally identical output.
2. **webpack pinned to 5.95.0** — Docusaurus 3.10.0's `webpackbar` dependency passes options (`reporters`, `color`, `name`) to webpack's ProgressPlugin that webpack 5.106.2 rejects with a strict schema validation error. Pinning to 5.95.0 resolves the conflict.
3. **Docusaurus upgraded to 3.10.0** — original spec used 3.7.0 which had the same webpack ProgressPlugin schema conflict. Upgrade was the recommended fix.
4. **Numeric prefix stripped from URLs** — Docusaurus 3 strips leading `01-`, `02-` etc. from document IDs and URL paths by default (`numberPrefixParser`). All sidebar entries, navbar links, and internal links use unprefixed paths (e.g., `/docs/manual/introduction`, not `/docs/manual/01-introduction`). File names retain the prefix for ordering.
5. **`BrowserOnly` wrapper in MDX pages** — both tool pages use `BrowserOnly` with dynamic require to prevent SSR hydration issues, per the brief's requirement.

## Known issues

- The `onBrokenMarkdownLinks` config option is deprecated in Docusaurus 3.10+ (moved to `markdown.hooks.onBrokenMarkdownLinks`). This generates a warning but does not break the build. Update before v4.
- `webpack` is pinned at `5.95.0` in `package.json`. If this package is updated to a later webpack version, the ProgressPlugin schema error may return until `webpackbar` releases a compatible update.

## Deploy instructions

```bash
cd asc606-training
npm install
npm run build
vercel --prod
```

Alternatively, connect the repo to Vercel and it will auto-deploy on push using `vercel.json`.

## Environment

- Node: v22.22.2
- Docusaurus: 3.10.0
- webpack: 5.95.0 (pinned)
- Deploy URL: https://asc606-training.vercel.app
