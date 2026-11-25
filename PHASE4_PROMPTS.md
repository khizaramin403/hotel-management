# PHASE 4 - BACKEND FOUNDATION AND AUTH SERVICE

Database, dev gateway, shared backend kit, then the Auth Service endpoint by endpoint. Ends with a manual Postman check.

**Before you start:** the previous phase is finished (check PROGRESS.md). Work top to bottom, one step at a time.

**How to use this file:** copy ONLY the code blocks. Everything outside the code blocks is for you. One new agent chat per step is the safest (the agent re-reads the root files, it does not need old chat history).

Steps in this file:

- STEP 4.1 - Docker, environment and checks
- STEP 4.2 - Dev gateway
- STEP 4.3 - Service kit (shared backend code)
- STEP 4.4 - Auth service scaffold
- STEP 4.5 - Migrations, tables and seed (auth)
- STEP 4.6 - Auth: register
- STEP 4.7 - Auth: login and tokens
- STEP 4.8 - Auth: me, refresh, logout
- STEP 4.9 - Auth: staff management
- STEP 4.10 - Auth: rate limiting
- STEP 4.11 - Auth: OpenAPI docs
- STEP 4.12 - Review Phase 4 (auth) (review)
- STEP 4.13 - MANUAL CHECK: Auth in Postman (manual check)

---

## STEP 4.1 - Docker, environment and checks

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 4.1 ONLY: prepare Postgres, Redis and the environment files.

Do exactly this:
1. Create docker-compose.yml at the root with `postgres` (16, port 5432, volume, user `hotel`, password `hotel_dev_password`, database `hotel`) and `redis` (7, port 6379, volume, command `redis-server --maxmemory-policy noeviction`), both with healthchecks.
2. Update .env.example with: NODE_ENV, DATABASE_URL, REDIS_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_TTL=15m, INTERNAL_KEY, PAYMENT_WEBHOOK_SECRET, ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080, GATEWAY_PORT=8080, and the five service ports. Copy it to .env and fill the secrets with random dev values (do not print them).
3. Root scripts: `db:up` (docker compose up -d postgres redis), `db:down`, `db:logs`, `check:env`.
4. scripts/check-env.ts: verifies the required env vars exist, tries to connect to Postgres and Redis, prints OK or FAIL for each item.
5. If Docker is not installed, stop and tell me. Otherwise run `pnpm db:up` and `pnpm check:env`.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 4.1 (Docker, environment and checks): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 4.1 | what was done`. Do not change anything else.
```

---

## STEP 4.2 - Dev gateway

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 4.2 ONLY: create the development API gateway (the stand-in for Nginx).

Do exactly this:
1. infra/dev-gateway (package `@hotel/dev-gateway`): Node + TypeScript + http-proxy-middleware on port 8080 (GATEWAY_PORT).
2. Route table (the same one Nginx will use later): /api/v1/auth -> 3001, /api/v1/rooms -> 3002, /api/v1/bookings -> 3003, /api/v1/chat -> 3004, /api/v1/notifications -> 3005, /socket.io -> 3004 (websocket upgrade handled). /internal is never proxied (404).
3. Adds `x-request-id` when missing, forwards cookies and x-forwarded-* headers, logs one Pino line per request, returns the error envelope with 502 INTERNAL_ERROR 'Service unavailable' when a service is down.
4. GET /health returns the gateway status plus a map of every service /health (up or down, 1 s timeout).
5. Root scripts: `dev:gateway`, and `dev:services` (concurrently; every service is added as it is created).
6. Tests: route matching, /internal blocked, 502 when a target is down.
7. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 4.2 (Dev gateway): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 4.2 | what was done`. Do not change anything else.
```

---

## STEP 4.3 - Service kit (shared backend code)

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 4.3 ONLY: create the shared backend package @hotel/service-kit.

Do exactly this:
1. packages/service-kit built with tsup (cjs + esm + d.ts) with Jest tests.
2. Exports: createLogger (Pino, pretty in dev), requestId middleware, AppError and subclasses (BadRequest, Unauthenticated, Forbidden, NotFound, Conflict, Validation, RateLimited) using the error codes from @hotel/shared, errorHandler (envelope, hides internals, logs, optional Sentry hook), notFoundHandler, `validate(schema, 'body' | 'query' | 'params')` (Zod -> 422 with details), `authenticate` (reads the `access_token` cookie, verifies with JWT_ACCESS_SECRET, sets req.user {id, role, name, email}; expired -> TOKEN_EXPIRED), `authorize(...roles)`, `originCheck` (ALLOWED_ORIGINS on POST, PUT, PATCH, DELETE), `internalOnly` (x-internal-key), createPool (pg Pool, max 10, schema search_path), createRedis (ioredis), response helpers `ok(res, data, meta?)` and `created(res, data)`, `parseEnv(schema)`, `healthRouter(serviceName)`, `gracefulShutdown(server, closers)`.
3. Express 5 typing: add `req.user` through module augmentation.
4. Tests: AppError mapping, validate (valid and invalid), authenticate (valid, missing, expired, bad signature), authorize, originCheck, internalOnly.
5. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 4.3 (Service kit (shared backend code)): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 4.3 | what was done`. Do not change anything else.
```

---

## STEP 4.4 - Auth service scaffold

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 4.4 ONLY: create the empty auth-service app.

Do exactly this:
1. services/auth-service with package, tsconfig, and src/{app.ts, server.ts, config/env.ts, routes/index.ts, controllers/, services/, models/, middleware/}.
2. app.ts builds the Express app: helmet, CORS with credentials from ALLOWED_ORIGINS, cookie-parser, json body limit 100kb, requestId, originCheck, routes mounted under /api/v1/auth, health, notFoundHandler, errorHandler. server.ts starts it with gracefulShutdown. PORT 3001.
3. Scripts: dev (tsx watch), build (tsup), start, test, lint, typecheck. Add the service to `pnpm dev:services`.
4. Supertest tests: GET /health, unknown route -> 404 envelope, malformed JSON -> 400 BAD_REQUEST.
5. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 4.4 (Auth service scaffold): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 4.4 | what was done`. Do not change anything else.
```

---

## STEP 4.5 - Migrations, tables and seed (auth)

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 4.5 ONLY: create the auth database layer.

Do exactly this:
1. Set up node-pg-migrate in auth-service (migrations folder, scripts migrate:up, migrate:down, migrate:create) using DATABASE_URL and the schema `auth`.
2. Migration 001: schema `auth`; table users (id serial pk, name, email, password_hash, role check in guest/staff/admin default guest, created_at, updated_at) with a unique index on lower(email); table refresh_tokens (id, user_id fk on delete cascade, token_hash unique, expires_at, revoked_at null, created_at) with an index on user_id.
3. models/userModel.ts and models/refreshTokenModel.ts: parameterized SQL only (findByEmail, findById, create, listByRole with pagination, delete, token create, find, revoke, revokeAllForUser).
4. scripts/seed-auth.ts and `pnpm seed:auth`: upsert the three seed users from API_CONTRACT section 9, hashing with argon2.
5. Model tests against the dev database (each test in a transaction that rolls back; explain how in the report).
6. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 4.5 (Migrations, tables and seed (auth)): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 4.5 | what was done`. Do not change anything else.
```

---

## STEP 4.6 - Auth: register

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 4.6 ONLY: implement POST /api/v1/auth/register.

Do exactly this:
1. Per API_CONTRACT section 3: validate with registerSchema, lowercase the email, hash with argon2, unique email -> 409 EMAIL_TAKEN (also handle the unique-violation race), return 201 { user } without any password field.
2. Keep the layers: route -> validate middleware -> controller -> service -> model.
3. Tests: success, duplicate email, invalid body (422 with details), password rules, response never contains the hash.
4. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 4.6 (Auth: register): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 4.6 | what was done`. Do not change anything else.
```

---

## STEP 4.7 - Auth: login and tokens

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 4.7 ONLY: implement POST /api/v1/auth/login and the token service.

Do exactly this:
1. services/tokenService.ts: signAccess(user) valid 15 minutes, signRefresh() as 48 random bytes stored hashed (sha256) in refresh_tokens with a 7 day expiry, and a cookie options helper (httpOnly, sameSite lax, secure in production, refresh cookie path /api/v1/auth).
2. Login: validate, find the user, verify with argon2 (also verify against a dummy hash when the user does not exist so timing stays equal). Wrong email or password -> 401 UNAUTHENTICATED with the same message 'Email or password is incorrect'. Success sets both cookies and returns 200 { user }.
3. Tests: success and cookie flags, wrong password, unknown email gives the same message, refresh token is stored hashed.
4. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 4.7 (Auth: login and tokens): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 4.7 | what was done`. Do not change anything else.
```

---

## STEP 4.8 - Auth: me, refresh, logout

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 4.8 ONLY: implement GET /auth/me, POST /auth/refresh, POST /auth/logout.

Do exactly this:
1. GET /auth/me with `authenticate`.
2. POST /auth/refresh: read the refresh cookie, find the hashed token (not revoked, not expired), rotate (revoke the old one, create a new one), set both cookies, return { user }. Reuse of a revoked token revokes all tokens of that user and returns 401.
3. POST /auth/logout: revoke the refresh token if present, clear both cookies, return 204.
4. Tests: me with and without cookie, expired access token -> TOKEN_EXPIRED, refresh rotation, reuse detection, logout clears cookies.
5. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 4.8 (Auth: me, refresh, logout): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 4.8 | what was done`. Do not change anything else.
```

---

## STEP 4.9 - Auth: staff management

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 4.9 ONLY: implement the admin staff endpoints.

Do exactly this:
1. GET /auth/staff (pagination, meta), POST /auth/staff, DELETE /auth/staff/:id. Admin only. Deleting a user that is not staff -> 403 FORBIDDEN; unknown id -> 404; deleting revokes that user's refresh tokens.
2. Pagination: page, limit (max 50), envelope with meta.
3. Tests: admin succeeds; guest and staff get 403; logged out gets 401; duplicate email 409; validation 422; deleting an admin 403.
4. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 4.9 (Auth: staff management): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 4.9 | what was done`. Do not change anything else.
```

---

## STEP 4.10 - Auth: rate limiting

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 4.10 ONLY: add Redis-backed rate limits.

Do exactly this:
1. In service-kit add `limiter({ name, windowMs, max, keyGenerator })` using express-rate-limit with rate-limit-redis. It returns the 429 RATE_LIMITED envelope and a Retry-After header.
2. Apply in auth-service: login 10 per 15 minutes keyed by ip + email; register 5 per hour per ip; refresh 30 per 15 minutes per ip; all other auth routes 100 per minute per ip.
3. Support running behind the gateway with a TRUST_PROXY env (default 1 in production).
4. Tests with a test-specific Redis key prefix: the 11th login returns 429 with Retry-After; counters are separate per email.
5. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 4.10 (Auth: rate limiting): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 4.10 | what was done`. Do not change anything else.
```

---

## STEP 4.11 - Auth: OpenAPI docs

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 4.11 ONLY: document the auth endpoints with OpenAPI.

Do exactly this:
1. Serve OpenAPI 3 docs for the auth endpoints at /docs (swagger-ui-express). Disabled in production unless ENABLE_DOCS=true. Build the schemas from the Zod schemas if practical (zod-to-openapi), otherwise write them by hand to match the contract.
2. Document the cookie auth security scheme and the error envelope.
3. Test that /docs returns 200 in development.
4. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 4.11 (Auth: OpenAPI docs): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 4.11 | what was done`. Do not change anything else.
```

---

## STEP 4.12 - Review Phase 4 (auth)

Type: Backend / tooling
  |  **REVIEW**

_Send this only after every earlier step of this phase is finished._

**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 4.12 ONLY: review the auth service against the contract and fix differences. Do not add new features.

Do exactly this:
1. Produce a table for the auth service (section 3): endpoint (method and path), access rule, success status, error statuses, response shape, status (OK or Different) compared with docs/API_CONTRACT.md.
2. Check the layering rule: controllers hold no SQL and no business logic, SQL lives only in models and is always parameterized (search for template strings and concatenation in queries), every body/query/params goes through the Zod validation middleware, every error is an AppError. Report OK or Different per rule.
3. Check security: `authorize` AND ownership check on every guest route, cookie flags (httpOnly, SameSite=Lax, Secure in production), rate limits on public POST routes, helmet, CORS and Origin check, no secrets or passwords in logs, generic error messages.
4. Check the backend rules in PERFORMANCE.md (pagination everywhere, indexes used by list queries with EXPLAIN, one pool per service, no SELECT * on lists, cache and queue rules). Report OK or Different.
5. Check tests: every endpoint has success, validation, auth and permission tests. Run tests with a coverage summary and add the missing tests.
6. Check migrations: drop and recreate the dev schema, run all migrations from scratch, run the seed scripts, and confirm `migrate:down` works for the last migration.
7. Fix every Different item. Do not add new features.
8. Run lint, typecheck, tests and the build for auth-service, service-kit and the gateway.

Stop after this step. Report the tables, what you fixed, and what still differs and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 4.12 (Review Phase 4 (auth)): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 4.12 | what was done`. Do not change anything else.
```

---

## STEP 4.13 - MANUAL CHECK: Auth in Postman

Type: Backend / tooling
  |  **MANUAL CHECK**

**1. Send this prompt (the agent prepares everything):**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 4.13 ONLY: prepare the environment for the manual Postman check of the auth service. Do not change code unless a command fails.

Do exactly this:
1. Run migrations, seed auth (`pnpm seed:auth`), then start the gateway and the auth service.
2. Call GET http://localhost:8080/health and print the result.
3. Print: the gateway URL, the three seed accounts, and the Postman environment values I must set (host_url = http://localhost:8080).
4. Stop and wait for me. Keep the processes running.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**2. YOUR CHECKLIST - you do this by hand. Do NOT send it to the agent.**

| # | What to do | What you should see |
|---|---|---|
| 1 | Import | Postman: Import `postman/hotel-platform.postman_collection.json` and `postman/hotel-platform.postman_environment.json`; choose the environment 'Hotel Platform - Local'; set `host_url` to `http://localhost:8080`. |
| 2 | 00 Health > Gateway health | 200 with the auth service shown as up. |
| 3 | 01 Auth > Register guest | 201, role guest. Send it a second time with the same email in the body (edit it): 409 EMAIL_TAKEN. |
| 4 | 01 Auth > Login as guest | 200; open the Cookies jar for localhost: `access_token` and `refresh_token` exist and are HttpOnly. |
| 5 | 01 Auth > Current user (me) | 200 with role guest. |
| 6 | 01 Auth > Refresh token | 200; the refresh cookie value changed. |
| 7 | 01 Auth > Logout, then Current user | Logout 204; then me gives 401. |
| 8 | 01 Auth > Login as admin, List staff | 200 with meta. Create staff 201. Delete staff 204. |
| 9 | Role rule | Login as staff, then List staff: 403. Login as guest, then List staff: 403. |
| 10 | 06 Negative > 422 weak password | 422 with `error.details` array. |
| 11 | 06 Negative > 429 login rate limit | Run it about 12 times with the Collection Runner: first 401, then 429 with a Retry-After header. |

**3a. Everything passed -> send:**

```markdown
MANUAL CHECK PASSED for STEP 4.13 (MANUAL CHECK: Auth in Postman). Add one line to PROGRESS.md in the format `YYYY-MM-DD | STEP 4.13 | manual check passed: <what I checked in 6 to 10 words>` with today's date. Do not change anything else.
```

**3b. Something failed -> send the matching FAIL template from PROMPTS.md (section 6), filled in.**


---
