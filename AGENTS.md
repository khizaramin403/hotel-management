# AGENTS.md - rules for the coding agent

You are building a **Hotel Booking Platform** (single hotel) step by step. The owner sends one small prompt at a time.
Your job is to do exactly that one step, well, and stop.

## What the product is
- Guests browse rooms, book, pay (payment result arrives by webhook), chat with reception and make an audio call.
- Staff (reception) manage bookings and answer chats and calls.
- Admin manages rooms, prices, images, staff accounts and reports.
- One hotel only. No multi-tenant. No chatbot. English UI only.

## Sources of truth (read in this order)
1. AGENTS.md (this file)
2. DECISIONS.md - fixed choices. Do not change them without asking.
3. DESIGN.md - every UI rule (frontend steps).
4. PERFORMANCE.md - performance rules.
5. docs/API_CONTRACT.md - the API, shapes, errors, events (every step that touches API, mocks or shared schemas).
6. docs/design/*.pdf - visual reference: wireframes of every page and the design system.
   If you cannot read a PDF, rely on DESIGN.md and say so in your report.
7. PROGRESS.md - what is already done. Never redo a finished step.

## Step protocol
- Do **only** the step in the prompt. Do not add features, do not "improve" other files, do not refactor outside the step.
- If something the step needs is missing from an earlier step, stop and say what is missing. Do not invent it silently.
- Before adding a dependency that is not named in DECISIONS.md, stop and ask. Adding one named there is fine.
- After every step run what exists: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` for the part you touched. Fix failures before reporting.
- Do not run `git commit` or `git push`. The owner commits.
- Do not edit root `.md` files, `docs/` or `postman/`. Exceptions: PROGRESS.md (only when the progress prompt is sent) and DECISIONS.md (only when you are told to log a decision).
- Never print or commit secrets. Use `.env.example` for names, real values stay in `.env` (git-ignored).
- If a step is a MANUAL CHECK step, prepare the environment, print what the owner needs, then stop. The owner tests by hand in Postman or the browser.
- Report format at the end of every step: what you created or changed (files), commands you ran and their result, what you could not do and why.
- If anything is unclear, ask one short question and stop. Do not guess.

## Machine and tooling
- The developer machine is **Windows**. Use cross-platform commands only: pnpm scripts, `cross-env`, `tsx`, Node scripts. No bash-only scripts in package scripts.
- Package manager: pnpm workspaces. Node 20 or newer.
- Language: TypeScript everywhere, `strict` on. No `any` (use `unknown` and narrow). No `// @ts-ignore` without a comment saying why.
- Docker Desktop may not be installed. If a step needs Docker and it is missing, stop and tell the owner.

## Repository layout
```
apps/web/                 Next.js frontend
services/auth-service/    Express (port 3001)
services/room-service/    Express (port 3002)
services/booking-service/ Express (port 3003)
services/chat-service/    Express + Socket.IO (port 3004)
services/notification-service/ Express + BullMQ workers (port 3005)
packages/shared/          @hotel/shared  - Zod schemas, types, enums (frontend + backend)
packages/service-kit/     @hotel/service-kit - logger, errors, middleware, db helper (backend only)
infra/                    dev gateway, nginx, pm2, docker files
scripts/                  seed and helper scripts (Node/tsx)
docs/                     API_CONTRACT.md, design PDFs, later DEPLOY.md and ARCHITECTURE.md
postman/                  collection + environment
```

## Frontend rules (short version, full text in DESIGN.md and PERFORMANCE.md)
- Next.js App Router, Tailwind CSS v3 for layout, Ant Design v5 for components. Use Ant Design components for tables, forms, sidebar, messages, modals, steps, tags, skeleton, empty, result.
- Client state in Redux Toolkit. Server data in TanStack Query. Never copy API data into Redux.
- Every page has loading (Skeleton), empty (Empty) and error (Alert or Result) states.
- No emoji in the UI, no gradients, no glow, no glassmorphism. Colors, fonts, spacing only from DESIGN.md tokens.
- Strings in the UI are plain English literals in the components (no i18n library).
- Never hard-code colors in components. Use Tailwind token classes or Ant Design tokens.

## Backend rules
- Layers per service: routes -> middleware -> controllers -> services -> models. Controllers hold no business logic. Models hold all SQL.
- SQL is always parameterized (`$1`, `$2`). Never build SQL with string concatenation.
- Every request body, query and params are validated with Zod schemas from `@hotel/shared` through the validation middleware.
- Every error is an `AppError` handled by the central error middleware. Response envelope and error codes are in docs/API_CONTRACT.md.
- Role check (`authorize`) AND ownership check on every guest route.
- Each service owns its own Postgres schema. A service never queries another service's tables. It calls the other service's API.
- Logs through Pino with the request id. No `console.log` in service code.
- Write tests (Jest + Supertest) for every endpoint: success, validation error, auth error, permission error.
