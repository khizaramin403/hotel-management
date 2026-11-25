# PROGRESS

One line per finished step, newest at the bottom.
Format: `YYYY-MM-DD | STEP x.y | what was done`
Step list and prompts: PROMPTS.md and the PHASE*_PROMPTS.md files.

2026-11-23 | STEP 0.0 | Project created: repository hotel-management on GitHub (branch main), README.md only
2026-11-25 | STEP 0.1 | Workspace skeleton created with root config files and empty apps, services, packages, infra, and scripts folders
2026-11-25 | STEP 0.2 | Root shared tooling configured with TypeScript, ESLint, Prettier, tsx, concurrently, and cross-env
2026-11-25 | STEP 0.3 | Created @hotel/shared package with contract enums, Zod schemas, inferred types, money helpers, and Vitest tests
2026-11-25 | STEP 0.4 | Added minimal GitHub Actions CI workflow running frozen-lockfile install, lint, typecheck, test, and build on main
2026-11-25 | STEP 1.1 | Created Next.js app in apps/web with @hotel/shared workspace link, env files, and all 13 route group placeholders
2026-11-25 | STEP 1.2 | Installed Tailwind CSS v3 with design tokens, Inter and Fraunces fonts, globals.css, and temporary /design-check verification page
