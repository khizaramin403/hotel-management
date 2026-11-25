# PHASE 6 - CONNECT FRONTEND TO THE REAL API

Switch the mock modules off one by one (auth, rooms, bookings). Chat stays mocked until phase 7.

**Before you start:** the previous phase is finished (check PROGRESS.md). Work top to bottom, one step at a time.

**How to use this file:** copy ONLY the code blocks. Everything outside the code blocks is for you. One new agent chat per step is the safest (the agent re-reads the root files, it does not need old chat history).

Steps in this file:

- STEP 6.1 - Connect auth (real)
- STEP 6.2 - Connect rooms (real)
- STEP 6.3 - Connect bookings and payment (real)
- STEP 6.4 - Real error handling pass
- STEP 6.5 - Contract check script
- STEP 6.6 - MANUAL CHECK: full flow in the browser (manual check)
- STEP 6.7 - Review Phase 6 and Newman (review)

---

## STEP 6.1 - Connect auth (real)

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 6.1 ONLY: connect the frontend to the real auth service and the gateway.

Do exactly this:
1. next.config: add rewrites `/api/v1/:path*` -> `${GATEWAY_URL}/api/v1/:path*` (server-side env GATEWAY_URL, default http://localhost:8080).
2. Update apps/web/.env.example and .env.local: NEXT_PUBLIC_MOCK_MODULES=rooms,bookings,chat (auth removed, so it goes to the real API).
3. Root script `dev:all` (concurrently: gateway, all services that exist, web).
4. Verify in the browser: register, login for all three roles, route protection with the real `access_token` cookie, refresh (temporarily set JWT_ACCESS_TTL=30s to see the refresh interceptor work, then restore 15m), logout.
5. Fix every mismatch between the frontend and docs/API_CONTRACT.md. If the contract itself must change, stop and ask me.
6. Run lint, typecheck, tests and the web build.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 6.1 (Connect auth (real)): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 6.1 | what was done`. Do not change anything else.
```

---

## STEP 6.2 - Connect rooms (real)

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 6.2 ONLY: switch the rooms module to the real API.

Do exactly this:
1. Remove `rooms` from NEXT_PUBLIC_MOCK_MODULES. Start auth, room, booking services.
2. Check the home list, filters, sorting, pagination, room detail, availability and the admin rooms table and form (image upload still waits for phase 7: the uploader may show an error; note it).
3. Compare actual responses with the shared Zod schemas (the dev-mode warning from step 1.6 must stay silent). Fix mismatches on whichever side is wrong; ask me if the contract must change.
4. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 6.2 (Connect rooms (real)): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 6.2 | what was done`. Do not change anything else.
```

---

## STEP 6.3 - Connect bookings and payment (real)

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 6.3 ONLY: switch the bookings module to the real API.

Do exactly this:
1. Remove `bookings` from NEXT_PUBLIC_MOCK_MODULES.
2. Check the full guest flow: booking, the idempotency key on retry, pay, polling, the dev 'Simulate paid' and 'Simulate failed' buttons, 409 on a second booking, my bookings tabs, cancel, pay-now for a pending booking.
3. Check staff and admin: bookings table filters and actions, dashboard cards and chart, reports page.
4. Fix mismatches (ask me if the contract must change).
5. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 6.3 (Connect bookings and payment (real)): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 6.3 | what was done`. Do not change anything else.
```

---

## STEP 6.4 - Real error handling pass

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 6.4 ONLY: make every real error code look right in the UI.

Do exactly this:
1. Go through docs/API_CONTRACT.md section 1 error codes and make sure each one is handled in the UI: 401 mid-session (silent refresh, then login redirect), 403 (Result page or toast), 404 (Result), 409 (messages from DESIGN.md section 11), 422 (field errors), 429 (toast 'Too many attempts. Try again in N seconds.' using Retry-After), 500 and NETWORK_ERROR (Alert 'Could not reach the server.' with 'Try again').
2. Test by stopping a service (for example room-service) and by sending bad data. List what you tested.
3. Add component tests for the 429 and network error messages.
4. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 6.4 (Real error handling pass): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 6.4 | what was done`. Do not change anything else.
```

---

## STEP 6.5 - Contract check script

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 6.5 ONLY: create a script that verifies the running stack against @hotel/shared.

Do exactly this:
1. scripts/contract-check.ts and `pnpm contract:check`: logs in with the three seed accounts and calls every endpoint in API_CONTRACT sections 3, 4 and 5 (creating and cleaning its own test data), then validates each response body and status with the Zod schemas and the error envelope. Prints a table of OK or FAIL.
2. Run it with all services up. Fix every FAIL in the code (ask me if the contract must change).
3. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 6.5 (Contract check script): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 6.5 | what was done`. Do not change anything else.
```

---

## STEP 6.6 - MANUAL CHECK: full flow in the browser

Type: Frontend
  |  **MANUAL CHECK**

**1. Send this prompt (the agent prepares everything):**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference.

STEP 6.6 ONLY: prepare the full stack for a manual browser check. Do not change code unless a command fails.

Do exactly this:
1. Reset the dev database (drop schemas, migrate, seed auth, rooms, bookings), then start everything with `pnpm dev:all`.
2. Print the URL (http://localhost:3000), the accounts, and which module is still mocked (chat).
3. Stop and wait for me.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**2. YOUR CHECKLIST - you do this by hand. Do NOT send it to the agent.**

| # | What to do | What you should see |
|---|---|---|
| 1 | Guest flow | Register a new guest, find a room with dates, book, pay (Simulate paid), see the booking confirmed in My bookings. |
| 2 | Second guest | Register another guest, try to book the same room and dates: the 409 Alert. |
| 3 | Cancel | Cancel the first booking; the second guest can now book those dates. |
| 4 | Staff | staff@example.com: Check in and Check out the booking. |
| 5 | Admin | admin@example.com: create a room, edit its price, see it on the home page (after cache TTL or immediately if invalidated), deactivate it; reports show the booking. |
| 6 | Security | Open /dashboard as a guest: 403 page. Log out, open /my-bookings: redirected to login. |
| 7 | Errors | Stop room-service: the home page shows the error Alert with 'Try again'. Start it again and click Try again. |

**3a. Everything passed -> send:**

```markdown
MANUAL CHECK PASSED for STEP 6.6 (MANUAL CHECK: full flow in the browser). Add one line to PROGRESS.md in the format `YYYY-MM-DD | STEP 6.6 | manual check passed: <what I checked in 6 to 10 words>` with today's date. Do not change anything else.
```

**3b. Something failed -> send the matching FAIL template from PROMPTS.md (section 6), filled in.**


---

## STEP 6.7 - Review Phase 6 and Newman

Type: Frontend
  |  **REVIEW**

_Send this only after every earlier step of this phase is finished._

**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference.

STEP 6.7 ONLY: review the integration and automate the Postman collection.

Do exactly this:
1. Install newman at the root (dev) and add `pnpm postman:run` (runs postman/hotel-platform.postman_collection.json with postman/hotel-platform.postman_environment.json, host_url from env POSTMAN_HOST_URL default http://localhost:8080, folders 00 to 07, skipping the image requests).
2. Run the whole stack and the collection. Report every failed request and fix the code (not the collection) unless the collection is clearly wrong; tell me what you changed.
3. Check frontend pages on real data against DESIGN.md section 8 (loading, empty, error states, 375px) and PERFORMANCE.md frontend rules; fix differences.
4. Produce one table: area (auth, rooms, bookings, errors, performance), status OK or Different.
5. Run lint, typecheck, all tests and the builds.

Stop after this step. Report the tables, what you fixed, and what still differs and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 6.7 (Review Phase 6 and Newman): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 6.7 | what was done`. Do not change anything else.
```

---
