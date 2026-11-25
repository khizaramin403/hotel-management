# PHASE 5 - ROOM AND BOOKING SERVICES

Rooms first (with a manual check), then bookings, payments, webhook and reports (with a second manual check).

**Before you start:** the previous phase is finished (check PROGRESS.md). Work top to bottom, one step at a time.

**How to use this file:** copy ONLY the code blocks. Everything outside the code blocks is for you. One new agent chat per step is the safest (the agent re-reads the root files, it does not need old chat history).

Steps in this file:

- STEP 5.1 - Room service: scaffold, tables, seed
- STEP 5.2 - Room service: list and detail
- STEP 5.3 - Room service: Redis cache
- STEP 5.4 - Room service: admin CRUD
- STEP 5.5 - MANUAL CHECK: Rooms in Postman (manual check)
- STEP 5.6 - Booking service: scaffold, tables, constraint
- STEP 5.7 - Booking service: create booking
- STEP 5.8 - Booking service: read, cancel, staff actions
- STEP 5.9 - Booking service: payment and webhook
- STEP 5.10 - Availability between services
- STEP 5.11 - Booking service: reports
- STEP 5.12 - Review Phase 5 (rooms and bookings) (review)
- STEP 5.13 - MANUAL CHECK: Bookings, webhook, negative tests (manual check)

---

## STEP 5.1 - Room service: scaffold, tables, seed

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 5.1 ONLY: create room-service with its database layer.

Do exactly this:
1. services/room-service (port 3002) with the same structure as auth-service, built on service-kit: app, server, env, health, scripts, node-pg-migrate with schema `rooms`. Add it to `pnpm dev:services`.
2. Migration 001: schema `rooms`; rooms (id, number unique, type check, price_per_night int check > 0, capacity int check 1 to 8, facilities text[] default '{}', description text, is_active bool default true, created_at, updated_at); room_images (id, room_id fk cascade, s3_key, is_cover bool, sort_order int, created_at). Indexes: rooms(type, price_per_night) where is_active, rooms(is_active), room_images(room_id).
3. models/roomModel.ts and models/imageModel.ts with parameterized SQL.
4. scripts/seed-rooms.ts and `pnpm seed:rooms`: the 12 rooms from API_CONTRACT section 9 (same order as the frontend mock: 101-104, 201-204, 301-302, 210-211) and image rows with keys rooms/room-NN-1..3.webp, first is the cover.
5. Model tests against the dev database.
6. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 5.1 (Room service: scaffold, tables, seed): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 5.1 | what was done`. Do not change anything else.
```

---

## STEP 5.2 - Room service: list and detail

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 5.2 ONLY: implement GET /rooms and GET /rooms/:id.

Do exactly this:
1. GET /rooms: filters type, minPrice, maxPrice, guests (capacity >= guests), sort, page, limit (default 12, max 50), `includeInactive` honored only for admin. Returns Room[] with coverImage and meta. checkIn and checkOut are validated (both or none); the availability filter is added in step 5.10, ignore them for now.
2. GET /rooms/:id returns RoomDetail with images in order; inactive rooms -> 404 for non-admin.
3. Image URL helper in the service: for now urls.sm, md and lg all equal `${IMAGE_BASE_URL}/${key}` (variants come in step 7.10).
4. Run EXPLAIN on the list query and report whether the indexes are used.
5. Tests: each filter, sorting, pagination meta, inactive hidden, 404, 422 on bad query values.
6. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 5.2 (Room service: list and detail): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 5.2 | what was done`. Do not change anything else.
```

---

## STEP 5.3 - Room service: Redis cache

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 5.3 ONLY: add the Redis cache for room reads.

Do exactly this:
1. services/cache.ts: get and set JSON with TTL through ioredis; key builder from the sorted, sanitized query params. TTL: list 60 s, detail 120 s. Cache only public (non-admin) responses.
2. `invalidateRooms()` deletes by key prefix with SCAN (never KEYS). It is called by the write endpoints in step 5.4.
3. Fail open: if Redis is down, answer from the database and log a warning.
4. In non-production add a response header `x-cache: HIT|MISS`.
5. Tests: second identical request is a HIT, different params use different keys, Redis down falls back to the database.
6. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 5.3 (Room service: Redis cache): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 5.3 | what was done`. Do not change anything else.
```

---

## STEP 5.4 - Room service: admin CRUD

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 5.4 ONLY: implement the admin room endpoints and the internal room routes.

Do exactly this:
1. POST /rooms, PATCH /rooms/:id, DELETE /rooms/:id (soft delete) per API_CONTRACT section 4, admin only, with createRoomSchema and updateRoomSchema. Duplicate number -> 409 ROOM_NUMBER_TAKEN. Call invalidateRooms() after every write.
2. Internal routes with `internalOnly`: GET /internal/rooms/:id and GET /internal/rooms/count -> { activeRooms }.
3. Tests: every endpoint success, 401, 403 (guest and staff), 422, 409, 404, plus cache invalidation after writes, plus internal routes without the key -> 403.
4. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 5.4 (Room service: admin CRUD): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 5.4 | what was done`. Do not change anything else.
```

---

## STEP 5.5 - MANUAL CHECK: Rooms in Postman

Type: Backend / tooling
  |  **MANUAL CHECK**

**1. Send this prompt (the agent prepares everything):**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 5.5 ONLY: prepare the environment for the manual Postman check of the room service. Do not change code unless a command fails.

Do exactly this:
1. Run migrations and seeds for auth and rooms, then start the gateway, auth-service and room-service.
2. Call GET http://localhost:8080/health and print the result.
3. Print the URLs and accounts. Stop and wait for me.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**2. YOUR CHECKLIST - you do this by hand. Do NOT send it to the agent.**

| # | What to do | What you should see |
|---|---|---|
| 1 | 01 Auth > Login as admin | 200. |
| 2 | 02 Rooms > List rooms | 200, `data` array, `meta.total` is 12, every room has a `coverImage`. |
| 3 | Same request again, look at response headers | `x-cache`: MISS the first time, HIT the second time. |
| 4 | 02 Rooms > Create room (admin) | 201; the test saves `room_id`. Change `number` to `101` and send again: 409 ROOM_NUMBER_TAKEN. |
| 5 | 02 Rooms > Get room | 200 with `images` array. |
| 6 | 02 Rooms > Update room price (admin) | 200; list rooms again and see the new price (cache invalidated). |
| 7 | 01 Auth > Login as guest, then 06 Negative > 403 guest calls an admin route | 403. |
| 8 | 06 Negative > 404 unknown room | 404 NOT_FOUND. |
| 9 | 07 Cleanup > Deactivate room (login as admin first) | 204; then Get room as a public call gives 404. |
| 10 | Skip | Image upload requests (they work after step 7.9). |

**3a. Everything passed -> send:**

```markdown
MANUAL CHECK PASSED for STEP 5.5 (MANUAL CHECK: Rooms in Postman). Add one line to PROGRESS.md in the format `YYYY-MM-DD | STEP 5.5 | manual check passed: <what I checked in 6 to 10 words>` with today's date. Do not change anything else.
```

**3b. Something failed -> send the matching FAIL template from PROMPTS.md (section 6), filled in.**


---

## STEP 5.6 - Booking service: scaffold, tables, constraint

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 5.6 ONLY: create booking-service with its database layer and the double-booking constraint.

Do exactly this:
1. services/booking-service (port 3003), same structure, schema `bookings`. Add it to `pnpm dev:services`.
2. Migration 001: `CREATE EXTENSION IF NOT EXISTS btree_gist`; bookings (id serial pk, user_id int, guest_name text, room_id int, room_number text, room_type text, check_in date, check_out date, guests int, nights int, subtotal int, tax_amount int, total_price int, status check in the five statuses default 'pending', expires_at timestamptz, idempotency_key uuid, created_at, updated_at, CHECK check_out > check_in, UNIQUE (user_id, idempotency_key)); EXCLUDE USING gist (room_id WITH =, daterange(check_in, check_out) WITH &&) WHERE (status <> 'cancelled'); payments (id serial pk, booking_id fk, amount int, status check in the four statuses default 'pending', provider_ref text, created_at, updated_at). Indexes: bookings(room_id, check_in, check_out), bookings(user_id, created_at desc), bookings(status, check_in), payments(booking_id). user_id and room_id are plain integers (no cross-schema foreign keys); room_number and room_type are snapshots.
3. models/bookingModel.ts and models/paymentModel.ts (parameterized SQL).
4. scripts/seed-bookings.ts and `pnpm seed:bookings`: about 14 bookings across statuses with dates relative to today, using user ids 1 to 3 and room ids 1 to 12 (document the assumption).
5. Tests: the constraint rejects an overlapping insert for the same room, allows adjacent dates (check_out equal to the next check_in), and allows an overlap when the other booking is cancelled.
6. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 5.6 (Booking service: scaffold, tables, constraint): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 5.6 | what was done`. Do not change anything else.
```

---

## STEP 5.7 - Booking service: create booking

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 5.7 ONLY: implement POST /bookings.

Do exactly this:
1. Guest only. Validate the `Idempotency-Key` header (UUID; missing -> 400 IDEMPOTENCY_KEY_REQUIRED) and the body with createBookingSchema; business rules from API_CONTRACT section 2.
2. Fetch the room from room-service `GET /internal/rooms/:id` (x-internal-key, 2 s timeout, 1 retry). Missing or inactive -> 404; guests above capacity -> 422; service unreachable -> 500 INTERNAL_ERROR with a clear log line.
3. Compute nights, subtotal, tax (10% rounded) and total with the helper from @hotel/shared. Insert in a transaction. Map the exclusion violation (code 23P01) to 409 ROOM_NOT_AVAILABLE. Status pending, expires_at = now + 15 minutes, guest_name from the user in the token.
4. Idempotency: when (user_id, idempotency_key) exists return the existing booking with 200; handle the race through the unique violation.
5. Response uses the Booking shape (payment null).
6. Tests (room-service replaced by a stub server): success 201, replay 200 with the same id, overlap 409, past date 422, capacity 422, missing key 400, staff and admin 403, logged out 401, and two simultaneous requests for the same room and dates (Promise.all) -> exactly one 201 and one 409.
7. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 5.7 (Booking service: create booking): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 5.7 | what was done`. Do not change anything else.
```

---

## STEP 5.8 - Booking service: read, cancel, staff actions

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 5.8 ONLY: implement the read and state-change endpoints.

Do exactly this:
1. GET /bookings/my (status one or comma-separated, pagination, newest first), GET /bookings/:id (owner; staff and admin any; another guest -> 403), PATCH /bookings/:id/cancel (owner, staff, admin; allowed from pending and confirmed; a paid payment becomes refunded; otherwise 409 INVALID_STATE), GET /bookings (staff and admin: status, from, to, q for BK-<id> or guest name ILIKE, pagination), PATCH /bookings/:id/status (staff and admin, transitions from the contract).
2. Include `payment: { id, status } | null` with a join. Select only the needed columns.
3. Every state change runs in a transaction with `SELECT ... FOR UPDATE` on the booking row.
4. Tests per endpoint: success, 401, 403 (including a guest opening another guest's booking), 404, 409 INVALID_STATE, pagination meta, q search.
5. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 5.8 (Booking service: read, cancel, staff actions): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 5.8 | what was done`. Do not change anything else.
```

---

## STEP 5.9 - Booking service: payment and webhook

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 5.9 ONLY: implement payment start, the signed webhook and the dev simulate route.

Do exactly this:
1. POST /bookings/:id/pay (owner): the booking must be pending and not expired, else 409 INVALID_STATE. Create (or reuse the pending) payment. Response { paymentId, amount, status: 'pending' }.
2. POST /bookings/webhooks/payment: use the RAW body for HMAC-SHA256 (hex) verification with PAYMENT_WEBHOOK_SECRET (express.raw on this route only, timingSafeEqual). Bad or missing signature -> 401 INVALID_SIGNATURE. Validate the payload with the shared webhook schema. In one transaction: paid -> payment paid and booking confirmed (only if the booking is still pending; if it was cancelled or expired, mark the payment refunded and log it); failed -> payment failed. A repeated event is a no-op returning 200.
3. POST /bookings/dev/payments/:paymentId/simulate: only when NODE_ENV is not production (404 in production). It builds the payload, signs it and calls the same handler function.
4. scripts/fake-payment.ts and `pnpm fake:payment <paymentId> [paid|failed]`: posts a signed webhook through the gateway.
5. Add hook functions `onBookingConfirmed(booking)` and `onBookingCancelled(booking)` that do nothing yet (queues arrive in phase 7).
6. Tests: valid and invalid signature, paid -> confirmed, failed, replay no-op, payment after cancel, simulate disabled in production, pay on a non-pending booking -> 409.
7. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 5.9 (Booking service: payment and webhook): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 5.9 | what was done`. Do not change anything else.
```

---

## STEP 5.10 - Availability between services

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 5.10 ONLY: connect room availability with bookings.

Do exactly this:
1. booking-service: POST /internal/availability { checkIn, checkOut } (internalOnly) -> { unavailableRoomIds } using one query for rooms with non-cancelled overlapping bookings.
2. room-service: when GET /rooms has checkIn and checkOut, call that internal endpoint (2 s timeout, 1 retry; on failure fail open: skip the filter, log a warning and set the response header `x-availability: unknown`) and exclude those rooms in SQL. Include the dates in the cache key and use a 15 s TTL for date queries.
3. room-service: GET /rooms/:id/availability validates the dates, checks that room through the internal endpoint and returns { available, nights, subtotal, taxAmount, totalPrice }.
4. Tests with stubs for both directions, including the fail-open case.
5. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 5.10 (Availability between services): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 5.10 | what was done`. Do not change anything else.
```

---

## STEP 5.11 - Booking service: reports

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 5.11 ONLY: implement the report endpoints.

Do exactly this:
1. GET /bookings/reports/sales and /bookings/reports/occupancy (admin only) per the contract. Use SQL aggregates with generate_series so days without bookings appear as zero rows. Revenue counts confirmed, checked_in and checked_out bookings by check-in date. Occupancy uses room-nights per day divided by the number of active rooms from room-service `GET /internal/rooms/count`.
2. Validate from and to (from <= to, maximum range 92 days) -> 422.
3. Declare /reports/* before /:id so the route is not shadowed.
4. Tests with seeded bookings: totals, zero days, range validation, staff gets 403.
5. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 5.11 (Booking service: reports): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 5.11 | what was done`. Do not change anything else.
```

---

## STEP 5.12 - Review Phase 5 (rooms and bookings)

Type: Backend / tooling
  |  **REVIEW**

_Send this only after every earlier step of this phase is finished._

**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 5.12 ONLY: review the room and booking services against the contract and fix differences. Do not add new features.

Do exactly this:
1. Produce a table for the room service (section 4) and the booking service (section 5): endpoint (method and path), access rule, success status, error statuses, response shape, status (OK or Different) compared with docs/API_CONTRACT.md.
2. Check the layering rule: controllers hold no SQL and no business logic, SQL lives only in models and is always parameterized (search for template strings and concatenation in queries), every body/query/params goes through the Zod validation middleware, every error is an AppError. Report OK or Different per rule.
3. Check security: `authorize` AND ownership check on every guest route, cookie flags (httpOnly, SameSite=Lax, Secure in production), rate limits on public POST routes, helmet, CORS and Origin check, no secrets or passwords in logs, generic error messages.
4. Check the backend rules in PERFORMANCE.md (pagination everywhere, indexes used by list queries with EXPLAIN, one pool per service, no SELECT * on lists, cache and queue rules). Report OK or Different.
5. Check tests: every endpoint has success, validation, auth and permission tests. Run tests with a coverage summary and add the missing tests.
6. Check migrations: drop and recreate the dev schema, run all migrations from scratch, run the seed scripts, and confirm `migrate:down` works for the last migration.
7. Fix every Different item. Do not add new features.
8. Run lint, typecheck, tests and the build for room-service, booking-service and service-kit.

Stop after this step. Report the tables, what you fixed, and what still differs and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 5.12 (Review Phase 5 (rooms and bookings)): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 5.12 | what was done`. Do not change anything else.
```

---

## STEP 5.13 - MANUAL CHECK: Bookings, webhook, negative tests

Type: Backend / tooling
  |  **MANUAL CHECK**

**1. Send this prompt (the agent prepares everything):**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 5.13 ONLY: prepare the environment for the manual Postman check of rooms and bookings. Do not change code unless a command fails.

Do exactly this:
1. Run migrations and seeds for auth, rooms and bookings, then start the gateway, auth-service, room-service and booking-service.
2. Call GET http://localhost:8080/health and print the result.
3. Print the URLs, accounts and the value of PAYMENT_WEBHOOK_SECRET's variable NAME only (not the secret) and tell me to copy the secret from .env into the Postman environment variable `webhook_secret`.
4. Stop and wait for me.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**2. YOUR CHECKLIST - you do this by hand. Do NOT send it to the agent.**

| # | What to do | What you should see |
|---|---|---|
| 1 | Setup | Admin: Create room (saves `room_id`). Then Login as guest. |
| 2 | 03 Bookings > Create booking (guest) | 201, status pending, `expiresAt` about 15 minutes ahead. `booking_id` is saved. |
| 3 | Replay | Copy the Idempotency-Key header value from the console, paste it as a fixed header and resend: 200 with the same booking id. |
| 4 | 06 Negative > 409 overlapping dates | 409 ROOM_NOT_AVAILABLE. |
| 5 | 03 Bookings > My bookings, Get booking | 200 each. |
| 6 | 03 Bookings > Start payment (guest) | 200; `payment_id` saved. |
| 7 | 04 Webhooks > Payment webhook (signed) | 200. (Needs `webhook_secret` set correctly.) |
| 8 | 04 Webhooks > Verify booking is confirmed | status confirmed. |
| 9 | 06 Negative > 401 webhook with a bad signature | 401 INVALID_SIGNATURE. |
| 10 | Login as staff > All bookings, Set status checked_in | 200 each. |
| 11 | Login as admin > Sales report, Occupancy report | 200, `daily` rows, numbers look plausible. |
| 12 | 06 Negative > 403 guest opens another guest's booking | Set `other_booking_id` to a seeded booking owned by someone else; expect 403 (or 404). |
| 13 | 06 Negative > 422 check-out before check-in, 400 missing Idempotency-Key | 422 and 400. |
| 14 | Room availability | Get room availability for the booked dates: `available` false. Rooms list with the same dates no longer contains that room. |
| 15 | 07 Cleanup | Cancel booking 200 (payment refunded), then deactivate the room 204. |

**3a. Everything passed -> send:**

```markdown
MANUAL CHECK PASSED for STEP 5.13 (MANUAL CHECK: Bookings, webhook, negative tests). Add one line to PROGRESS.md in the format `YYYY-MM-DD | STEP 5.13 | manual check passed: <what I checked in 6 to 10 words>` with today's date. Do not change anything else.
```

**3b. Something failed -> send the matching FAIL template from PROMPTS.md (section 6), filled in.**


---
