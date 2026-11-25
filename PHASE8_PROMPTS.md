# PHASE 8 - PRODUCTION, DEPLOY, FINAL CHECKS

Docker, Nginx gateway, PM2, monitoring, security, backups, CI/CD, AWS guide, final audits and docs.

**Before you start:** the previous phase is finished (check PROGRESS.md). Work top to bottom, one step at a time.

**How to use this file:** copy ONLY the code blocks. Everything outside the code blocks is for you. One new agent chat per step is the safest (the agent re-reads the root files, it does not need old chat history).

Steps in this file:

- STEP 8.1 - Dockerfiles
- STEP 8.2 - Nginx API gateway
- STEP 8.3 - PM2 and graceful shutdown
- STEP 8.4 - Sentry and logging audit
- STEP 8.5 - Security hardening audit
- STEP 8.6 - Backups
- STEP 8.7 - Full CI
- STEP 8.8 - CD to EC2
- STEP 8.9 - DEPLOY.md (AWS guide)
- STEP 8.10 - MANUAL: AWS setup by the owner (manual check)
- STEP 8.11 - Final audits
- STEP 8.12 - Final documentation
- STEP 8.13 - MANUAL CHECK: production smoke test (manual check)

---

## STEP 8.1 - Dockerfiles

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 8.1 ONLY: create production Docker images.

Do exactly this:
1. Multi-stage Dockerfile for each service and for the web app (Node 22 alpine, pnpm, build then run, non-root user, healthcheck, .dockerignore).
2. docker-compose.prod.yml for a local production-like run: web, all services and workers, nginx (added in 8.2), postgres, redis, minio, coturn. Environment from .env files, no secrets in the image.
3. Build every image and start the stack; report image sizes and any failure.
4. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 8.1 (Dockerfiles): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 8.1 | what was done`. Do not change anything else.
```

---

## STEP 8.2 - Nginx API gateway

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 8.2 ONLY: create the production Nginx gateway.

Do exactly this:
1. infra/nginx/nginx.conf with the same route table as the dev gateway: /api/v1/auth, rooms, bookings, chat, notifications to the services, /socket.io with websocket upgrade headers to chat-service, everything else to the web app. /internal returns 404.
2. limit_req (20 r/s, burst 40) on the API routes, gzip for JSON and text, `client_max_body_size 2m`, `X-Request-Id` ($request_id) forwarded and returned, security headers, long cache for /_next/static, proxy timeouts.
3. A commented HTTPS server block with certbot instructions.
4. Run it through docker-compose.prod.yml and check with curl: health, a public room list, a blocked /internal, a websocket upgrade.
5. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 8.2 (Nginx API gateway): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 8.2 | what was done`. Do not change anything else.
```

---

## STEP 8.3 - PM2 and graceful shutdown

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 8.3 ONLY: add PM2 and audit shutdown behavior.

Do exactly this:
1. infra/pm2/ecosystem.config.js: auth, room and booking services in cluster mode with 2 instances; chat-service 1 instance; workers as separate apps; web with `next start`; logs, max_memory_restart, kill_timeout.
2. Audit every service and worker: on SIGTERM stop accepting requests, finish in-flight work, close the pool, Redis and queues, then exit. Fix gaps.
3. Check that each service's /health reflects database and Redis connectivity (degraded status when down).
4. Tests for the shutdown helper.
5. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 8.3 (PM2 and graceful shutdown): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 8.3 | what was done`. Do not change anything else.
```

---

## STEP 8.4 - Sentry and logging audit

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 8.4 ONLY: add Sentry and audit logs.

Do exactly this:
1. Sentry for the web app (client and server) and for the services through service-kit. Disabled when the DSN env is empty. Release tag from git SHA. Scrub cookies, authorization headers and passwords.
2. Audit Pino logs: request id on every line, redaction of cookies, authorization and password fields, no PII beyond ids, log levels per environment.
3. Add a dev-only route or script that throws a test error so I can verify Sentry; confirm it is not available in production.
4. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 8.4 (Sentry and logging audit): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 8.4 | what was done`. Do not change anything else.
```

---

## STEP 8.5 - Security hardening audit

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 8.5 ONLY: audit security and fix findings.

Do exactly this:
1. Produce a checklist table (OK or Different): helmet and a CSP for the web app, cookie flags, CORS list, Origin check, rate limits on every public POST, validation coverage (list routes without a schema), no string-built SQL, ownership tests for every guest route, timing-safe webhook comparison, upload limits, generic error messages, secrets not in git (grep), `pnpm audit` results.
2. Fix every Different item. Add tests for the ownership and permission gaps you find.
3. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 8.5 (Security hardening audit): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 8.5 | what was done`. Do not change anything else.
```

---

## STEP 8.6 - Backups

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 8.6 ONLY: create the database backup and restore scripts.

Do exactly this:
1. scripts/backup-db.ts: runs pg_dump (document that pg_dump must be installed), writes a timestamped compressed file to ./backups (git-ignored), optional upload to S3 when env is set, deletes backups older than 14 days.
2. scripts/restore-db.ts: restores a chosen file into a target database. Prove it by restoring into a scratch database and comparing row counts.
3. Root scripts `backup:db` and `restore:db`.
4. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 8.6 (Backups): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 8.6 | what was done`. Do not change anything else.
```

---

## STEP 8.7 - Full CI

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 8.7 ONLY: extend the CI workflow.

Do exactly this:
1. Update .github/workflows/ci.yml: Postgres and Redis service containers, lint, typecheck, unit tests, migrations, builds, start the stack and run `pnpm postman:run` (Newman). Cache the pnpm store. Upload the Newman report as an artifact.
2. Make the workflow fail on any Newman failure.
3. Explain in the report which secrets or variables (if any) must be set in GitHub.
4. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 8.7 (Full CI): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 8.7 | what was done`. Do not change anything else.
```

---

## STEP 8.8 - CD to EC2

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 8.8 ONLY: create the deploy workflow.

Do exactly this:
1. Create .github/workflows/deploy.yml: runs after CI succeeds on main; SSH to the EC2 host with the secrets EC2_HOST, EC2_USER, EC2_SSH_KEY and variable APP_URL; on the server: git pull, pnpm install --frozen-lockfile, build, run migrations, `pm2 reload ecosystem.config.js`; then a smoke test with curl on APP_URL/health, then Newman against APP_URL (read-only folders).
2. Add a simple rollback note: how to return to the previous commit and reload.
3. Do not put real values anywhere; list the secrets to create.
4. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 8.8 (CD to EC2): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 8.8 | what was done`. Do not change anything else.
```

---

## STEP 8.9 - DEPLOY.md (AWS guide)

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 8.9 ONLY: write the deployment guide. In this step you may create docs/DEPLOY.md.

Do exactly this:
1. Write docs/DEPLOY.md: EC2 (Ubuntu, instance size note for a demo), security group (22 from my IP, 80, 443), installing Node, pnpm, Nginx, PM2, certbot; RDS PostgreSQL (private, security group allowing the EC2 group), Redis (on EC2 or ElastiCache), S3 bucket and a least-privilege IAM user, domain and HTTPS, env files on the server, first deploy, backups cron line, costs warning and teardown steps.
2. Each section: numbered steps with exact commands and what I should see. Mark every step that I must do myself in the AWS console.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 8.9 (DEPLOY.md (AWS guide)): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 8.9 | what was done`. Do not change anything else.
```

---

## STEP 8.10 - MANUAL: AWS setup by the owner

Type: Backend / tooling
  |  **MANUAL CHECK**

**1. Send this prompt (the agent prepares everything):**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 8.10 ONLY: verify deployment readiness. Do not change code unless a check fails.

Do exactly this:
1. Verify every variable in .env.example is documented in docs/DEPLOY.md, `pnpm build` works from a clean clone state (delete node_modules and dist, install, build), and the deploy workflow references only secrets listed in DEPLOY.md.
2. Report anything missing. Stop.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**2. YOUR CHECKLIST - you do this by hand. Do NOT send it to the agent.**

| # | What to do | What you should see |
|---|---|---|
| 1 | Follow docs/DEPLOY.md | Create EC2, RDS, S3, domain and HTTPS yourself in the AWS console. |
| 2 | Secrets | Add the GitHub secrets listed in DEPLOY.md. |
| 3 | First deploy | Push to main; watch the Actions tab: CI then Deploy. |
| 4 | Smoke | Open https://<your domain>/api/v1/rooms and https://<your domain>/health. |
| 5 | Cost | Check the AWS billing page the next day; use the teardown steps when you finish demos. |

**3a. Everything passed -> send:**

```markdown
MANUAL CHECK PASSED for STEP 8.10 (MANUAL: AWS setup by the owner). Add one line to PROGRESS.md in the format `YYYY-MM-DD | STEP 8.10 | manual check passed: <what I checked in 6 to 10 words>` with today's date. Do not change anything else.
```

**3b. Something failed -> send the matching FAIL template from PROMPTS.md (section 6), filled in.**


---

## STEP 8.11 - Final audits

Type: Frontend


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference.

STEP 8.11 ONLY: run the final audits and fix findings.

Do exactly this:
1. Remove the temporary /design-check route and any other dev-only pages. Make sure mocks, query devtools and the payment simulate buttons are not in the production build (NEXT_PUBLIC_USE_MOCKS=false, NEXT_PUBLIC_SHOW_DEV_PAYMENT=false) and the simulate API returns 404 in production.
2. Run Lighthouse (mobile and desktop) on the rooms list and room detail against a production build; report scores and fix problems until the targets in PERFORMANCE.md are met or explain why not.
3. Run an accessibility check on every page (Lighthouse accessibility and a keyboard walk-through); fix findings.
4. Report the first-load JS size for each route; explain any route over 250 KB.
5. Measure p95 for GET /rooms (cached) and POST /bookings locally and report.
6. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report the tables, what you fixed, and what still differs and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 8.11 (Final audits): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 8.11 | what was done`. Do not change anything else.
```

---

## STEP 8.12 - Final documentation

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 8.12 ONLY: write the final documentation. In this step you may replace README.md and create docs/ARCHITECTURE.md.

Do exactly this:
1. README.md: what the project is, architecture diagram (Mermaid), how to run everything locally (prerequisites, `pnpm install`, `pnpm db:up`, migrations, seeds, `pnpm dev:all`), accounts, scripts table, env variables table, folder structure, links to docs/API_CONTRACT.md, the Postman collection, the design PDFs and docs/DEPLOY.md.
2. docs/ARCHITECTURE.md: services and their data, request flow for login, booking and payment, realtime flow, queues, security model, scalability notes (what is implemented and what is design only: read replicas, CDN, auto scaling).
3. Do not change anything else.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 8.12 (Final documentation): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 8.12 | what was done`. Do not change anything else.
```

---

## STEP 8.13 - MANUAL CHECK: production smoke test

Type: Backend / tooling
  |  **MANUAL CHECK**

**1. Send this prompt (the agent prepares everything):**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 8.13 ONLY: prepare the final smoke-test instructions. Do not change code.

Do exactly this:
1. Print the exact Postman environment values for production (host_url = https://<your domain>, secrets by name only).
2. Stop.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**2. YOUR CHECKLIST - you do this by hand. Do NOT send it to the agent.**

| # | What to do | What you should see |
|---|---|---|
| 1 | Postman environment | Duplicate the environment, set `host_url` to your live domain, and set the production webhook secret. |
| 2 | Run folders 00 to 04 and 06 | All green. (Skip image requests unless you set up S3.) |
| 3 | Browser | Book a room on the live site; check the email arrives and the booking confirms (use the real payment provider or the dev simulate only if you enabled it deliberately). |
| 4 | Mobile | Open the live site on your phone: home, room detail, booking. |
| 5 | Backup | Run `pnpm backup:db` against the production database and restore it into a scratch database. |

**3a. Everything passed -> send:**

```markdown
MANUAL CHECK PASSED for STEP 8.13 (MANUAL CHECK: production smoke test). Add one line to PROGRESS.md in the format `YYYY-MM-DD | STEP 8.13 | manual check passed: <what I checked in 6 to 10 words>` with today's date. Do not change anything else.
```

**3b. Something failed -> send the matching FAIL template from PROMPTS.md (section 6), filled in.**


---
