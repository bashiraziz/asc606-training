# ASC 606 Revenue Recognition Training Hub — Claude Code Brief

> **Instruction for Claude Code:** Do not search past conversations. This brief and
> `REFERENCE_IMPLEMENTATIONS.md` are the single source of truth. Build exactly what
> is specified here. If anything is unclear, make a reasonable judgment and note it
> in `IMPLEMENTATION.md` rather than stopping to ask.

---

## Reference implementations

Before writing any component code, read **`REFERENCE_IMPLEMENTATIONS.md`** in full.
It contains the complete, validated HTML/JavaScript source for both interactive tools —
the ASC 606 worksheet and the month-end close tracker — built and tested before this
Docusaurus project was started.

Use those implementations to understand:
- Exact tab structure and field names for both components
- All calculation logic and data flows (what feeds into what)
- Validation rules (DR = CR checks, PO distinctness evaluation, criteria pass/fail)
- UX behaviors (auto-population, sample data loading, running totals)
- Alert conditions (over-recognition, unbalanced JEs, incomplete checklists)

The React TypeScript components must reproduce all of this behavior faithfully —
rewritten with proper interfaces, hooks, and CSS modules, not copied verbatim.

---

## Project identity

**Site name:** ASC 606 Revenue Recognition Hub  
**Purpose:** A free, self-serve training and reference platform for accountants covering GAAP revenue recognition under ASC 606. Includes a full training manual, an interactive contract worksheet (five-step model), and a month-end close tracker.  
**Stack:** Docusaurus v3 + React + TypeScript + Vercel  
**Repo pattern:** Follow the same structure used in `far31-training`, `pool-rates-training`, and `far-overhaul-training` — this is the established pattern for this portfolio.

---

## Goals for this session

Build the complete Docusaurus site from scratch so it is ready to `vercel deploy` with:

1. Full training manual content (10 modules) as MDX pages
2. Interactive ASC 606 worksheet (React component, 8-tab five-step model)
3. Interactive month-end close tracker (React component, 7-tab close workflow)
4. Navigation, landing page, and site config wired up
5. Vercel deployment config

Do **not** add a database, auth, or any backend. This is a fully static site — all interactivity is client-side React state only. No `localStorage`.

---

## Repository structure to create

```
asc606-training/
├── CLAUDE.md                          ← this file (CC instructions)
├── REFERENCE_IMPLEMENTATIONS.md       ← validated HTML source for both components
├── IMPLEMENTATION.md                  ← build log (create and update as you go)
├── package.json
├── tsconfig.json
├── docusaurus.config.ts
├── sidebars.ts
├── vercel.json
├── static/
│   └── img/
│       └── logo.svg                   ← simple SVG, navy blue
├── src/
│   ├── css/
│   │   └── custom.css                 ← brand colors, typography overrides
│   ├── pages/
│   │   └── index.tsx                  ← landing page
│   └── components/
│       ├── Worksheet/
│       │   ├── index.tsx              ← ASC 606 five-step worksheet
│       │   └── worksheet.module.css
│       └── CloseTracker/
│           ├── index.tsx              ← month-end close tracker
│           └── closetracker.module.css
└── docs/
    ├── intro.md                       ← "How to use this site"
    ├── manual/
    │   ├── _category_.json
    │   ├── 01-introduction.mdx
    │   ├── 02-five-step-overview.mdx
    │   ├── 03-step1-contract.mdx
    │   ├── 04-step2-obligations.mdx
    │   ├── 05-step3-price.mdx
    │   ├── 06-step4-allocate.mdx
    │   ├── 07-step5-recognize.mdx
    │   ├── 08-other-topics.mdx
    │   ├── 09-disclosures.mdx
    │   └── 10-case-studies.mdx
    ├── tools/
    │   ├── _category_.json
    │   ├── worksheet.mdx              ← embeds <Worksheet /> component
    │   └── close-tracker.mdx          ← embeds <CloseTracker /> component
    └── examples/
        ├── _category_.json
        ├── compliant-examples.mdx
        └── non-compliant-examples.mdx
```

---

## Brand and design tokens

```css
/* src/css/custom.css — Docusaurus Infima overrides */
:root {
  --ifm-color-primary: #2E75B6;
  --ifm-color-primary-dark: #185FA5;
  --ifm-color-primary-darker: #0C447C;
  --ifm-color-primary-darkest: #1F3864;
  --ifm-color-primary-light: #378ADD;
  --ifm-color-primary-lighter: #85B7EB;
  --ifm-color-primary-lightest: #D6E4F7;
  --ifm-navbar-background-color: #1F3864;
  --ifm-navbar-link-color: #ffffff;
  --ifm-font-family-base: 'Inter', system-ui, sans-serif;
  --ifm-code-font-size: 85%;
  --docusaurus-highlighted-code-line-bg: rgba(46, 117, 182, 0.1);

  /* semantic */
  --color-compliant: #0F6E56;
  --color-compliant-bg: #E1F5EE;
  --color-violation: #A32D2D;
  --color-violation-bg: #FCEBEB;
  --color-warning-bg: #FAEEDA;
  --color-warning-txt: #633806;
}

[data-theme='dark'] {
  --ifm-color-primary: #85B7EB;
  --ifm-navbar-background-color: #0C1A2E;
}
```

---

## Page-by-page specifications

### `src/pages/index.tsx` — Landing page

Build a clean landing page with:

- **Hero section:** dark navy background (`#1F3864`), white heading "ASC 606 Revenue Recognition Hub", subtitle "Self-paced training, interactive tools, and compliance examples for accountants", two CTA buttons: "Start training →" (links to `/docs/intro`) and "Open worksheet →" (links to `/docs/tools/worksheet`)
- **Three feature cards** in a responsive grid:
  - "Training manual" — 10-module course covering the five-step model, disclosures, and practical expedients
  - "Interactive worksheet" — Step-by-step contract analysis with auto-calculations; five-step model guided form
  - "Month-end close tracker" — Subledger, journal entries, accruals, reconciliation, and close checklist
- **Compliance callout banner:** navy background, white text — "Built to ASC 606 / FASB — Revenue from Contracts with Customers. Effective for periods beginning after December 15, 2017."
- No auth, no sign-up, no newsletter — fully open access

### `docs/intro.md` — How to use this site

Write a short orientation page (300–400 words) explaining:
- What the site covers
- Recommended learning path: Manual first → Worksheet → Close Tracker → Examples
- Who it is for (accountants, controllers, auditors, finance managers)
- A note that all tools run in the browser — no account required, no data is saved or transmitted

### `docs/manual/` — Training manual (10 MDX pages)

Each page maps to one module. Use MDX so you can include callout boxes, tables, and tip/warning admonitions natively via Docusaurus.

Content outline per module:

| File | Module | Key content |
|------|--------|-------------|
| `01-introduction.mdx` | Introduction & background | Why revenue recognition matters; history from SAB 104/SOP 97-2 to ASC 606; scope exclusions |
| `02-five-step-overview.mdx` | Five-step model overview | Visual summary of all five steps; how they interact; when to revisit earlier steps |
| `03-step1-contract.mdx` | Step 1 — Identify the contract | Five criteria (approval, rights, payment terms, commercial substance, collectibility); contract modifications (3 scenarios); contract combinations |
| `04-step2-obligations.mdx` | Step 2 — Performance obligations | Distinct test (capable + within contract); series provision; principal vs. agent; bundling |
| `05-step3-price.mdx` | Step 3 — Transaction price | Variable consideration (EV vs. MLA methods); constraint; significant financing component; non-cash consideration; consideration payable to customer |
| `06-step4-allocate.mdx` | Step 4 — Allocate | Stand-alone selling price estimation (3 methods); proportional allocation; discount allocation; variable consideration allocation |
| `07-step5-recognize.mdx` | Step 5 — Recognize revenue | Over-time vs. point-in-time criteria; measurement methods (input/output); bill-and-hold (4 criteria); consignment |
| `08-other-topics.mdx` | Other key topics | Contract costs (ASC 340-40); licenses (access vs. use); warranties (assurance vs. service-type); material rights |
| `09-disclosures.mdx` | Disclosures | Quantitative requirements; qualitative requirements; all practical expedients table |
| `10-case-studies.mdx` | Case studies & knowledge check | Two worked case studies; 8-question True/False quiz with answer key |

**MDX conventions for all manual pages:**
- Use `:::tip`, `:::note`, `:::warning`, `:::danger` admonitions for callout boxes
- Use standard Markdown tables for comparison tables
- Use numbered lists for sequential steps
- Add a `---` frontmatter block with `sidebar_position`, `title`, and `description`
- Add a `## Key takeaways` section at the end of each module page

### `docs/tools/worksheet.mdx` — ASC 606 worksheet page

```mdx
---
title: ASC 606 contract worksheet
sidebar_position: 1
description: Interactive five-step contract analysis worksheet
---

import Worksheet from '@site/src/components/Worksheet';

# ASC 606 contract worksheet

Complete one worksheet per contract at inception. Work through all eight tabs in order.
All calculations are automatic. No data is saved — print or screenshot to retain your work.

<Worksheet />
```

### `docs/tools/close-tracker.mdx` — Close tracker page

```mdx
---
title: Month-end close tracker
sidebar_position: 2
description: Accrual-basis month-end revenue close workflow
---

import CloseTracker from '@site/src/components/CloseTracker';

# Month-end revenue close tracker

Accrual basis · ASC 606 · Use during every period-end close cycle.

<CloseTracker />
```

### `docs/examples/` — Compliance examples

Two MDX pages with rich content:

**`compliant-examples.mdx`** — Five compliant scenarios, each with:
- Facts box (blue background callout)
- Five-step analysis table
- Verdict callout (green) explaining the key judgments

Scenarios:
1. SaaS subscription + onboarding — two POs, over-time recognition
2. Long-term construction contract — input method, variable consideration constraint
3. Perpetual software license + PCS — right-to-use, proportional discount allocation
4. Franchise fee + royalties — sales-based royalty exception
5. Consignment arrangement — no recognition on delivery, revenue on end-customer sale

**`non-compliant-examples.mdx`** — Two non-compliant scenarios, each with:
- Facts box
- Five-step analysis table
- Red violation box listing specific ASC 606 violations
- Green correction box with required treatment

Scenarios:
1. Channel stuffing — premature recognition, no control transfer
2. Bill-and-hold without criteria — two of four criteria not met

Close with a comparison table: compliant indicators vs. non-compliant red flags (7 rows).

---

## Component specifications

### `src/components/Worksheet/index.tsx`

An 8-tab interactive form implementing the ASC 606 five-step model. All state lives in React `useState` — no persistence, no backend.

**Tabs:**
1. Contract info — customer name, contract number, date, entity, period, description
2. Step 1 — five-criteria table with Yes/No/N/A radio buttons; auto-evaluates and shows pass/fail banner
3. Step 2 — performance obligation table (up to 8 rows); each row has description, two distinct-test dropdowns, auto-computed "is PO?" result, and timing dropdown (OT/PT); "+ add PO" button; PO count badge
4. Step 3 — transaction price builder: base price input, variable consideration toggle (shows EV/MLA selector, gross amount, constraint selector, included amount), financing component toggle, non-cash consideration, consideration payable to customer; running **Total Transaction Price** display updates on every keystroke
5. Step 4 — allocation table auto-populated from Step 2 POs; SSP method dropdown and SSP amount input per PO; auto-calculates SSP %, allocated TP per PO; totals row; out-of-balance warning if SSP inputs are zero
6. Step 5 — recognition table from Step 2 POs; over-time/point-in-time badge from Step 2; method/trigger input; 4 period columns with amounts; per-row total; grand total row
7. Costs & disclosures — contract cost table (obtain/fulfill, treatment, amount, amortization months); disclosure checklist (8 items with checkbox toggle)
8. Summary & sign-off — metric cards (transaction price, PO count, OT vs PT split, disclosure completion); PO allocation summary table; alert list (unmet criteria, $0 TP, incomplete disclosures, over-recognition); sign-off table (Preparer, Reviewer, Manager/Controller, CFO)

**Key behaviors:**
- Progress bar at top tracks completion across tabs
- Tab navigation with Back/Next buttons
- All monetary inputs use `type="number"` with `step="0.01"`
- All displayed dollar amounts formatted via `toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})`
- Never use raw float math for display — always format before rendering
- Step 2 POs flow automatically into Step 4 and Step 5 tables
- Step 3 total flows automatically into Step 4 allocation
- "Load sample data" button on Step 2 prefills a SaaS + onboarding example

### `src/components/CloseTracker/index.tsx`

A 7-tab month-end close workflow. All state in React `useState`.

**Tabs:**
1. Dashboard — period selector (month/year); metric cards (revenue this period, OT revenue, PT revenue, deferred balance); contract-by-contract summary table from subledger; auto-generated alerts
2. Contract subledger — table with one row per PO (contract #, customer, PO description, type, allocated TP, prior recognized, this-period amount, deferred balance auto-calc, account code, status badge); "+ add row" button; "load sample data" button; period total bar
3. Journal entries — 5 collapsible JE cards:
   - JE-01: Over-time revenue (auto-populated from subledger OT rows)
   - JE-02: Point-in-time revenue (auto-populated from subledger PT rows)
   - JE-03: Deferred revenue release (manual DR/CR inputs)
   - JE-04: Unbilled revenue accrual (manual DR/CR inputs)
   - JE-05: Contract cost amortization (enter gross cost + months → monthly amount auto-calculates → pre-fills JE)
   - Each JE shows running DR total, CR total, and a balanced/unbalanced indicator
4. Accruals & deferrals — two sub-sections:
   - Accrued revenue table: contract/PO, customer, earned, invoiced, unbilled balance (auto), expected invoice date, notes
   - Deferred revenue roll-forward: contract/PO, customer, opening balance, additions, released, closing balance (auto)
5. Reconciliation — GL balance inputs (revenue, deferred revenue, contract asset); reconciliation table comparing subledger vs. GL with difference column and status badge; difference investigation log table
6. Period-end checklist — 27 items across 7 sections; items turn green when checked; progress counter in section header; summary alert at bottom
7. Modification log — table for logging contract changes (contract #, mod date, description, type, TP change, treatment, revenue impact, approver); quick-reference treatment guide below

**Key behaviors:**
- Subledger data flows into Dashboard, JE-01, JE-02, and Reconciliation automatically
- All JEs validate DR = CR; show green "Balanced" or red "Out of balance by $X"
- Progress bar tracks checklist completion
- Status badge in header updates: "Open" → "In progress" → "Close complete"

---

## `docusaurus.config.ts` — Key settings

```typescript
const config: Config = {
  title: 'ASC 606 Revenue Recognition Hub',
  tagline: 'Self-paced training and interactive tools for accountants',
  url: 'https://asc606-training.vercel.app',   // update after deploy
  baseUrl: '/',
  organizationName: 'bashiraziz',              // GitHub org
  projectName: 'asc606-training',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  i18n: { defaultLocale: 'en', locales: ['en'] },
  presets: [['classic', {
    docs: { sidebarPath: './sidebars.ts', routeBasePath: 'docs' },
    blog: false,                                // no blog needed
    theme: { customCss: './src/css/custom.css' },
  }]],
  themeConfig: {
    navbar: {
      title: 'ASC 606 Hub',
      logo: { alt: 'ASC 606 Hub', src: 'img/logo.svg' },
      items: [
        { to: '/docs/intro', label: 'Get started', position: 'left' },
        { to: '/docs/manual/01-introduction', label: 'Training manual', position: 'left' },
        { to: '/docs/tools/worksheet', label: 'Worksheet', position: 'left' },
        { to: '/docs/tools/close-tracker', label: 'Close tracker', position: 'left' },
        { to: '/docs/examples/compliant-examples', label: 'Examples', position: 'left' },
        { href: 'https://github.com/bashiraziz/asc606-training', label: 'GitHub', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        { title: 'Training', items: [
          { label: 'Introduction', to: '/docs/intro' },
          { label: 'Five-step model', to: '/docs/manual/02-five-step-overview' },
          { label: 'Case studies', to: '/docs/manual/10-case-studies' },
        ]},
        { title: 'Tools', items: [
          { label: 'ASC 606 worksheet', to: '/docs/tools/worksheet' },
          { label: 'Month-end close tracker', to: '/docs/tools/close-tracker' },
        ]},
        { title: 'Examples', items: [
          { label: 'Compliant scenarios', to: '/docs/examples/compliant-examples' },
          { label: 'Non-compliant scenarios', to: '/docs/examples/non-compliant-examples' },
        ]},
      ],
      copyright: `Built with Docusaurus · ASC 606 / FASB · Not a substitute for professional accounting advice`,
    },
    prism: { theme: require('prism-react-renderer').themes.github },
  },
};
```

---

## `sidebars.ts`

```typescript
const sidebars = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Training manual',
      collapsed: false,
      items: [
        'manual/01-introduction',
        'manual/02-five-step-overview',
        'manual/03-step1-contract',
        'manual/04-step2-obligations',
        'manual/05-step3-price',
        'manual/06-step4-allocate',
        'manual/07-step5-recognize',
        'manual/08-other-topics',
        'manual/09-disclosures',
        'manual/10-case-studies',
      ],
    },
    {
      type: 'category',
      label: 'Interactive tools',
      items: ['tools/worksheet', 'tools/close-tracker'],
    },
    {
      type: 'category',
      label: 'Compliance examples',
      items: ['examples/compliant-examples', 'examples/non-compliant-examples'],
    },
  ],
};
export default sidebars;
```

---

## `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "installCommand": "npm install",
  "framework": "docusaurus2"
}
```

---

## Sequenced task list for Claude Code

Work through these in order. Do not skip ahead. Update `IMPLEMENTATION.md` after each task is complete.

### Phase 1 — Scaffold

- [ ] **Task 1.1** — Run `npx create-docusaurus@latest asc606-training classic --typescript` in the parent directory. Accept all defaults.
- [ ] **Task 1.2** — Delete the default `docs/tutorial/` directory and `blog/` directory.
- [ ] **Task 1.3** — Install dependencies: `npm install` (no additional packages needed — Docusaurus classic ships with React and TypeScript).
- [ ] **Task 1.4** — Create the full directory structure listed above (`docs/manual/`, `docs/tools/`, `docs/examples/`, `src/components/Worksheet/`, `src/components/CloseTracker/`).
- [ ] **Task 1.5** — Add `vercel.json` and `docusaurus.config.ts` per the specs above.
- [ ] **Task 1.6** — Add `sidebars.ts` per spec.
- [ ] **Task 1.7** — Add `src/css/custom.css` with all brand tokens.
- [ ] **Task 1.8** — Create `static/img/logo.svg` — a simple SVG: white text "ASC 606" on transparent background, suitable for a navy navbar.
- [ ] **Task 1.9** — Run `npm run build` to confirm the scaffold compiles with no errors before adding content.

### Phase 2 — Landing page

- [ ] **Task 2.1** — Build `src/pages/index.tsx` per the landing page spec. Use Docusaurus `useDocusaurusContext` hook for site metadata. Style with CSS modules or inline styles — no Tailwind.
- [ ] **Task 2.2** — Run `npm start` and verify the landing page renders correctly with no console errors.

### Phase 3 — Training manual content

- [ ] **Task 3.1 through 3.10** — Create all 10 MDX files in `docs/manual/`. Each must have correct frontmatter (`sidebar_position`, `title`, `description`). Use admonitions, tables, and numbered lists as specified. Add `## Key takeaways` at the end of each. Write complete, accurate content — do not use placeholder text.
- [ ] **Task 3.11** — Create `docs/intro.md` with the orientation content.
- [ ] **Task 3.12** — Add `docs/manual/_category_.json`: `{"label": "Training manual", "position": 2, "collapsible": true, "collapsed": false}`
- [ ] **Task 3.13** — Run `npm run build` — confirm all docs compile with no broken links.

### Phase 4 — Worksheet component

- [ ] **Task 4.1** — Build `src/components/Worksheet/index.tsx`. Use only React hooks (`useState`, `useCallback`, `useMemo`). No external libraries. TypeScript strict mode. All state typed with interfaces.
- [ ] **Task 4.2** — Define TypeScript interfaces at the top of the file: `ContractInfo`, `CriterionResponse`, `PerformanceObligation`, `TransactionPrice`, `AllocationRow`, `RecognitionRow`, `ContractCost`, `SignOffRow`.
- [ ] **Task 4.3** — Implement the 8 tabs as described. Each tab renders as a conditional section based on `activeTab` state — do not use `display:none` or `visibility:hidden`; conditionally render with ternary/&&.
- [ ] **Task 4.4** — Implement the `loadSampleData` function that prefills the SaaS + onboarding example across all relevant state.
- [ ] **Task 4.5** — Create `worksheet.module.css` with scoped styles. Do not use global class names that could collide with Docusaurus.
- [ ] **Task 4.6** — Create `docs/tools/worksheet.mdx` and `docs/tools/_category_.json`.
- [ ] **Task 4.7** — Run `npm run build`. Confirm no TypeScript errors and no SSR issues. If the component uses `window` or `document`, wrap in `BrowserOnly` from `@docusaurus/react-loadable`.

### Phase 5 — Close tracker component

- [ ] **Task 5.1** — Build `src/components/CloseTracker/index.tsx`. Same constraints as Worksheet — hooks only, TypeScript, no external libraries.
- [ ] **Task 5.2** — Define TypeScript interfaces: `SubledgerRow`, `JournalEntryLine`, `AccrualRow`, `DeferralRow`, `ReconLine`, `ModificationEntry`, `ChecklistItem`.
- [ ] **Task 5.3** — Implement the 7 tabs. Subledger state must flow into Dashboard, JE-01, JE-02, and Reconciliation via derived values (`useMemo`).
- [ ] **Task 5.4** — The period-end checklist items must be defined as a typed constant array (27 items across 7 sections) — not hardcoded HTML.
- [ ] **Task 5.5** — Implement JE balance validation: for each JE, compute `totalDebits` and `totalCredits`; display a green/red indicator.
- [ ] **Task 5.6** — Implement `loadSampleData` that populates the subledger with the same 5-contract sample used in the design.
- [ ] **Task 5.7** — Create `closetracker.module.css`.
- [ ] **Task 5.8** — Create `docs/tools/close-tracker.mdx`.
- [ ] **Task 5.9** — Run `npm run build`. Fix all TypeScript errors.

### Phase 6 — Compliance examples

- [ ] **Task 6.1** — Create `docs/examples/compliant-examples.mdx` with all 5 compliant scenarios. Use MDX admonition syntax for facts boxes (:::info), verdict boxes (:::tip), and step analysis tables.
- [ ] **Task 6.2** — Create `docs/examples/non-compliant-examples.mdx` with both non-compliant scenarios. Use :::danger for violation boxes and :::tip for correction boxes.
- [ ] **Task 6.3** — Add closing comparison table (7 rows, 3 columns).
- [ ] **Task 6.4** — Add `docs/examples/_category_.json`.

### Phase 7 — Final validation and deploy prep

- [ ] **Task 7.1** — Run `npm run build` one final time. Zero errors, zero broken links required.
- [ ] **Task 7.2** — Run `npm run serve` and manually verify: landing page, 3 manual pages (spot-check), both tool pages (confirm components render), both example pages.
- [ ] **Task 7.3** — Confirm `vercel.json` is correct. Confirm `docusaurus.config.ts` has the correct `url` field (can leave as placeholder for now).
- [ ] **Task 7.4** — Update `IMPLEMENTATION.md` with: what was built, any deviations from this brief, known issues, and deploy instructions.
- [ ] **Task 7.5** — Output final deploy command: `vercel --prod` from the project root.

---

## IMPLEMENTATION.md — template to fill in as you go

```markdown
# ASC 606 Training Hub — Implementation log

## Status
[ ] Phase 1 — Scaffold
[ ] Phase 2 — Landing page
[ ] Phase 3 — Manual content
[ ] Phase 4 — Worksheet component
[ ] Phase 5 — Close tracker
[ ] Phase 6 — Examples
[ ] Phase 7 — Deploy prep

## Completed tasks
(fill in as each task is done)

## Deviations from brief
(note anything you changed and why)

## Known issues
(note anything that needs follow-up)

## Deploy instructions
1. `cd asc606-training`
2. `npm install`
3. `npm run build`
4. `vercel --prod`

## Environment
- Node: (record version)
- Docusaurus: (record version)
- Deploy URL: https://asc606-training.vercel.app
```

---

## Important constraints

- **No localStorage / sessionStorage** — Docusaurus does SSR; browser APIs will cause hydration errors. All state must be React state only.
- **BrowserOnly wrapper** — if either component uses any browser API at all (even `window.print`), wrap the entire component export in `import BrowserOnly from '@docusaurus/react-loadable'`.
- **No Tailwind** — use CSS modules or inline styles. Docusaurus ships its own design system (Infima); do not install Tailwind.
- **No external component libraries** — no shadcn, no MUI, no Ant Design. Build all UI from scratch with CSS modules.
- **TypeScript strict** — `"strict": true` in tsconfig. No `any` types except where unavoidable and commented.
- **MDX content must be accurate** — do not use lorem ipsum or placeholder content. All ASC 606 references must be correct (codification citations, step descriptions, etc.).
- **Mobile responsive** — both components and all pages must be usable on mobile. Use CSS grid with `minmax` and media queries.
- **Dark mode** — Docusaurus ships with dark mode toggle. Custom CSS must use `[data-theme='dark']` overrides where needed. Both components must be readable in dark mode.
