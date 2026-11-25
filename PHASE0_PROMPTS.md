# PHASE 0 - SETUP

Workspace, tooling, shared package and a minimal CI. No UI yet.

**Before you start:** the previous phase is finished (check PROGRESS.md). Work top to bottom, one step at a time.

**How to use this file:** copy ONLY the code blocks. Everything outside the code blocks is for you. One new agent chat per step is the safest (the agent re-reads the root files, it does not need old chat history).

Steps in this file:

- STEP 0.1 - Workspace skeleton
- STEP 0.2 - TypeScript, ESLint and Prettier
- STEP 0.3 - Shared package (schemas and types)
- STEP 0.4 - Minimal CI

---

## STEP 0.1 - Workspace skeleton

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 0.1 ONLY: check the project and create the pnpm workspace skeleton. Do not create apps or services yet.

Do exactly this:
1. List the root files and confirm these exist: AGENTS.md, DECISIONS.md, DESIGN.md, PERFORMANCE.md, PROGRESS.md, PROMPTS.md, PHASE0_PROMPTS.md to PHASE8_PROMPTS.md, docs/API_CONTRACT.md, docs/design/ (PDFs), postman/ (2 json files). Report anything missing.
2. Check Node (20 or newer), pnpm and git versions and report them. If pnpm is missing, tell me the install command and stop.
3. Create package.json (private, name `hotel-management`, placeholder scripts: lint, typecheck, test, build, format), pnpm-workspace.yaml (apps/*, services/*, packages/*, infra/*), .npmrc, .editorconfig, .gitignore (node_modules, .next, dist, coverage, .env, .env.local, *.log, .DS_Store), and .env.example with a header comment only.
4. Create the empty folders apps, services, packages, infra, scripts, each with a .gitkeep.
5. Do not touch README.md, docs/ or any root .md file.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 0.1 (Workspace skeleton): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 0.1 | what was done`. Do not change anything else.
```

---

## STEP 0.2 - TypeScript, ESLint and Prettier

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 0.2 ONLY: set up shared tooling at the repository root.

Do exactly this:
1. Install at the root (dev): typescript, eslint, typescript-eslint, eslint-config-prettier, prettier, concurrently, cross-env, tsx.
2. Create tsconfig.base.json: strict true, noUncheckedIndexedAccess true, noImplicitOverride true, target ES2022, module ESNext, moduleResolution Bundler, skipLibCheck, isolatedModules, esModuleInterop, resolveJsonModule, forceConsistentCasingInFileNames.
3. Create eslint.config.mjs (flat config): typescript-eslint recommended, `no-explicit-any` as error, `no-console` as warn (off in scripts/ and infra/), eslint-config-prettier last, ignore dist, .next, coverage, node_modules.
4. Create .prettierrc (semi true, double quotes, printWidth 100, trailingComma all) and .prettierignore.
5. Root scripts: `lint` (eslint .), `typecheck` (pnpm -r --if-present typecheck), `test` (pnpm -r --if-present test), `build` (pnpm -r --if-present build), `format`, `format:check`.
6. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 0.2 (TypeScript, ESLint and Prettier): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 0.2 | what was done`. Do not change anything else.
```

---

## STEP 0.3 - Shared package (schemas and types)

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 0.3 ONLY: create the @hotel/shared package from docs/API_CONTRACT.md.

Do exactly this:
1. Create packages/shared (name `@hotel/shared`) built with tsup (esm + cjs + d.ts). Scripts: build, dev (watch), typecheck, test (Vitest).
2. src/enums.ts: roles, room types, booking statuses, payment statuses, error codes (exactly as in the contract), allowed transitions map for bookings.
3. src/schemas: Zod schemas for entities (User, Image, Room, RoomDetail, Booking, Payment, Conversation, Message), the response envelope and error shape, and for every request body/query in the contract: register, login, createStaff, createRoom, updateRoom, roomsQuery, availabilityQuery, uploadUrl, saveImage, createBooking (checkOut after checkIn, nights max 30, guests 1-8), bookingsQuery, setStatus, reportQuery, paymentWebhook, createConversation, messagesQuery, sendMessage, pushSubscription.
4. src/types.ts: `z.infer` types for all schemas. src/index.ts exports everything. src/money.ts: `calcTotals(nights, pricePerNight)` returning subtotal, taxAmount (10% rounded), totalPrice, and `nightsBetween(checkIn, checkOut)`.
5. Vitest tests: valid and invalid cases for register, login, createBooking (dates order, nights > 30, guests), createRoom, plus calcTotals.
6. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 0.3 (Shared package (schemas and types)): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 0.3 | what was done`. Do not change anything else.
```

---

## STEP 0.4 - Minimal CI

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 0.4 ONLY: add a minimal GitHub Actions CI workflow.

Do exactly this:
1. Create .github/workflows/ci.yml: on push and pull_request to main; Node 22; pnpm via corepack or pnpm/action-setup; cache pnpm store; steps: install with --frozen-lockfile, lint, typecheck, test, build.
2. Do not add deploy steps yet. Do not add secrets.
3. Explain in the report that the first CI run needs pnpm-lock.yaml committed.
4. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 0.4 (Minimal CI): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 0.4 | what was done`. Do not change anything else.
```

---
