# PHASE 7 - REALTIME, QUEUES, NOTIFICATIONS, IMAGES

Chat service and Socket.IO, WebRTC audio, BullMQ jobs and email, web push, S3 images with resizing.

**Before you start:** the previous phase is finished (check PROGRESS.md). Work top to bottom, one step at a time.

**How to use this file:** copy ONLY the code blocks. Everything outside the code blocks is for you. One new agent chat per step is the safest (the agent re-reads the root files, it does not need old chat history).

Steps in this file:

- STEP 7.1 - Chat service: scaffold, tables, REST
- STEP 7.2 - Chat service: Socket.IO server
- STEP 7.3 - Frontend: real chat
- STEP 7.4 - Call signaling and TURN
- STEP 7.5 - Frontend: WebRTC audio
- STEP 7.6 - Notification service: BullMQ and email
- STEP 7.7 - Booking events to jobs, expiry
- STEP 7.8 - Web push
- STEP 7.9 - Image storage (S3 / MinIO)
- STEP 7.10 - Image resize worker
- STEP 7.11 - Frontend: real image upload
- STEP 7.12 - Review Phase 7 (review)
- STEP 7.13 - MANUAL CHECK: realtime, email, push, images (manual check)

---

## STEP 7.1 - Chat service: scaffold, tables, REST

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 7.1 ONLY: create chat-service with its database layer and REST endpoints.

Do exactly this:
1. services/chat-service (port 3004), same structure, schema `chat`. Add it to `pnpm dev:services`.
2. Migration 001: conversations (id, guest_id, guest_name, staff_id null, status open/closed, last_message_at, created_at); messages (id, conversation_id fk cascade, sender_id, sender_role, text, created_at); conversation_reads (conversation_id, user_id, last_read_message_id, primary key (conversation_id, user_id)). Indexes: messages(conversation_id, id desc), conversations(status, last_message_at desc), UNIQUE partial index on conversations(guest_id) where status = 'open'.
3. REST per API_CONTRACT section 6: POST /chat/conversations (guest; returns the existing open one with 200, otherwise 201), GET /chat/conversations (guest: own; staff and admin: all open; lastMessage and unreadCount in one query), GET /chat/conversations/:id/messages (cursor `id < cursor`, newest first, limit 30, access check: a guest only sees their own).
4. Tests for every endpoint including permission cases.
5. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 7.1 (Chat service: scaffold, tables, REST): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 7.1 | what was done`. Do not change anything else.
```

---

## STEP 7.2 - Chat service: Socket.IO server

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 7.2 ONLY: implement the Socket.IO server for chat messages.

Do exactly this:
1. Attach Socket.IO to the chat-service HTTP server (path /socket.io, CORS with credentials from ALLOWED_ORIGINS). Authentication middleware reads the `access_token` cookie with the service-kit verifier and sets socket.data.user; unauthenticated connections are rejected. Use @socket.io/redis-adapter.
2. Rooms: `conversation:<id>`; a guest joins their open conversation; staff and admin join the `staff` room and conversation rooms on demand.
3. Events per API_CONTRACT section 6: message:send (validate with the shared schema, check access, insert, ack with the Message, emit message:new to the conversation room, emit conversation:updated to the staff room), typing:start and typing:stop (throttled), conversation:read (upsert the read marker).
4. Rate limit message:send to 30 per minute per user; text 1 to 2000 characters.
5. Tests with socket.io-client against a test server: unauthenticated rejected, two clients exchange messages, another guest's conversation is denied.
6. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 7.2 (Chat service: Socket.IO server): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 7.2 | what was done`. Do not change anything else.
```

---

## STEP 7.3 - Frontend: real chat

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 7.3 ONLY: switch the chat module to the real socket.

Do exactly this:
1. Remove `chat` from NEXT_PUBLIC_MOCK_MODULES and add NEXT_PUBLIC_SOCKET_URL (http://localhost:8080 in development; same origin in production). SocketProvider uses RealSocket with credentials and reconnect with backoff.
2. Put the connection status in the Redux ui slice. While disconnected show the neutral banner 'Reconnecting...' (DESIGN.md section 8.9); messages sent while disconnected show the failed state with 'Retry'.
3. Make sure setQueryData updates work with real events and de-duplicate by message id.
4. Tests: reconnect banner, de-duplication.
5. Give me a short manual test note: guest in one browser profile, staff in another.
6. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 7.3 (Frontend: real chat): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 7.3 | what was done`. Do not change anything else.
```

---

## STEP 7.4 - Call signaling and TURN

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 7.4 ONLY: implement the call signaling server and the TURN setup.

Do exactly this:
1. chat-service: relay call:offer, call:answer, call:ice, call:reject and call:end to the other participant in the conversation room (validate payload sizes). Only one active call per conversation (otherwise reply call:rejected with reason 'busy'). Clean up on disconnect (emit call:ended). When an answered call ends, store a system message 'Call ended mm:ss'.
2. docker-compose: add a `coturn` service (ports 3478 udp and tcp, static dev credentials from env, realm hotel.local) with the config in infra/coturn/turnserver.conf.
3. GET /chat/ice-servers (logged in) returns STUN and TURN servers with time-limited credentials built from TURN_SECRET (HMAC), as in API_CONTRACT section 6. Add TURN_SECRET to .env.example.
4. Tests: relay, busy, disconnect cleanup, ice-servers shape.
5. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 7.4 (Call signaling and TURN): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 7.4 | what was done`. Do not change anything else.
```

---

## STEP 7.5 - Frontend: WebRTC audio

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 7.5 ONLY: implement real audio calls.

Do exactly this:
1. RealCallEngine implementing the CallEngine interface: getUserMedia (audio only; permission errors show Alert 'Microphone access is needed for calls'), RTCPeerConnection with iceServers from GET /chat/ice-servers, offer, answer and ICE through the socket events, hidden audio element for remote audio, mute toggle, hang up, stop tracks on cleanup, connection state mapped to the Redux call slice.
2. Use RealCallEngine when the chat module is real; keep MockCallEngine for mock mode.
3. Handle busy, reject, remote end, page unload and device changes. The timer starts at the connected state.
4. Unit tests with a fake RTCPeerConnection for state transitions.
5. Give me a manual test note: two browser profiles, both with a microphone.
6. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 7.5 (Frontend: WebRTC audio): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 7.5 | what was done`. Do not change anything else.
```

---

## STEP 7.6 - Notification service: BullMQ and email

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 7.6 ONLY: create notification-service with queues and email.

Do exactly this:
1. services/notification-service (port 3005) with an HTTP server and a separate worker entry (src/worker.ts). BullMQ queues `notifications` (jobs booking.confirmed, booking.cancelled, chat.message) and `maintenance`. Attempts 3 with exponential backoff, removeOnComplete 1000.
2. Add Mailpit to docker-compose (SMTP 1025, web UI 8025). The worker sends email with nodemailer; simple HTML + text templates for confirmation and cancellation (brand colors, no images).
3. Typed job payloads in @hotel/shared and a `getQueue(name)` helper in service-kit.
4. Tests: job processing with a mocked transport, retry on failure.
5. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 7.6 (Notification service: BullMQ and email): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 7.6 | what was done`. Do not change anything else.
```

---

## STEP 7.7 - Booking events to jobs, expiry

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 7.7 ONLY: connect booking events to the queues and implement booking expiry.

Do exactly this:
1. booking-service migration 002: add guest_email (snapshot from the token at creation; never returned by the API).
2. Replace onBookingConfirmed and onBookingCancelled with queue jobs (booking.confirmed, booking.cancelled) carrying what the email needs.
3. On booking creation add a delayed job `booking.expire` (15 minutes, jobId `expire:<bookingId>`). A worker in booking-service (src/worker.ts) cancels the booking if it is still pending (transaction, FOR UPDATE). Remove the delayed job when the booking is paid or cancelled. Also run a safety sweep at startup and every 5 minutes that cancels pending bookings with expires_at in the past (idempotent).
4. Tests: confirmed enqueues the right payload, expiry cancels only pending bookings, the sweep.
5. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 7.7 (Booking events to jobs, expiry): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 7.7 | what was done`. Do not change anything else.
```

---

## STEP 7.8 - Web push

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 7.8 ONLY: implement web push end to end.

Do exactly this:
1. notification-service: script `pnpm vapid:generate` writing VAPID keys to .env (not printed); endpoints per API_CONTRACT section 7 (public-key, subscribe, unsubscribe); table push_subscriptions in schema `notifications` (id, user_id, endpoint unique, p256dh, auth, created_at); web-push sending in the worker for booking.confirmed (guest) and chat.message (the other side when offline); delete a subscription on 404 or 410.
2. Frontend: public/sw.js (push and notificationclick opening /my-bookings or /chat), a `usePushSubscription` hook, and a 'Notifications' switch in the avatar menu that explains the permission and handles the denied state.
3. Tests: endpoints and expired-subscription cleanup.
4. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 7.8 (Web push): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 7.8 | what was done`. Do not change anything else.
```

---

## STEP 7.9 - Image storage (S3 / MinIO)

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 7.9 ONLY: implement room image upload with presigned URLs.

Do exactly this:
1. docker-compose: add MinIO (API 9000, console 9001) and create the bucket `hotel-images` on start. Env: S3_ENDPOINT, S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, IMAGE_BASE_URL (document in .env.example).
2. room-service: POST /rooms/:id/images/upload-url (admin) validates fileType and returns a presigned PUT (5 minutes) for key `rooms/<roomId>/<uuid>.<ext>`; POST /rooms/:id/images verifies the object exists with HeadObject and size <= 5 MB, creates the record (honoring isCover by clearing the others); DELETE removes the record, deletes the object and its variants, and promotes another cover. Invalidate the cache. Maximum 10 images per room (422).
3. Tests with MinIO or a mocked S3 client.
4. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 7.9 (Image storage (S3 / MinIO)): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 7.9 | what was done`. Do not change anything else.
```

---

## STEP 7.10 - Image resize worker

Type: Backend / tooling


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 7.10 ONLY: create the image resize worker.

Do exactly this:
1. After POST /rooms/:id/images enqueue `image.resize`. A worker (room-service/src/worker.ts) downloads the original, uses sharp to write `<key-without-ext>-400.webp`, `-800.webp` and `-1600.webp` (quality 80, width only, withoutEnlargement), uploads them with Cache-Control `public, max-age=31536000, immutable`, and sets `processed = true` (migration 002 on room_images).
2. API `urls`: sm, md, lg point to the variants once processed; before that all three point to the original key.
3. Apply the same naming in the frontend mock image helper.
4. Tests with sharp on a small fixture image.
5. Run lint, typecheck, tests and the build for what you touched. Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 7.10 (Image resize worker): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 7.10 | what was done`. Do not change anything else.
```

---

## STEP 7.11 - Frontend: real image upload

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 7.11 ONLY: switch room image upload to the real flow.

Do exactly this:
1. The uploader performs the real PUT to the presigned URL with progress and error handling. The original shows immediately; variants appear on the next fetch.
2. next.config images.remotePatterns for the S3 or MinIO host. RoomImage uses the right size by context (sm for cards, md for the detail page, lg for the lightbox and hero).
3. scripts/seed-images.ts: uploads local files from apps/web/public/images/rooms/ to MinIO and creates image rows for the seeded rooms, skipping files that do not exist.
4. Give me a manual test note.
5. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 7.11 (Frontend: real image upload): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 7.11 | what was done`. Do not change anything else.
```

---

## STEP 7.12 - Review Phase 7

Type: Backend / tooling
  |  **REVIEW**

_Send this only after every earlier step of this phase is finished._

**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 7.12 ONLY: review Phase 7 and fix differences. Do not add new features.

Do exactly this:
1. Produce a table of every endpoint and socket event added in this phase against docs/API_CONTRACT.md: status OK or Different.
2. Check layering, security (socket auth, rate limits, upload limits, TURN credentials expiry), PERFORMANCE.md backend rules, queue settings (attempts, backoff, removeOnComplete), graceful shutdown of workers.
3. Check the frontend: connection banner, call popup states, push switch, uploader states, DESIGN.md states, 375px, keyboard and contrast on the new UI.
4. Run all tests and report coverage gaps; add the missing tests.
5. Fix every Different item.
6. Run lint, typecheck, all tests and the builds.

Stop after this step. Report the tables, what you fixed, and what still differs and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 7.12 (Review Phase 7): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 7.12 | what was done`. Do not change anything else.
```

---

## STEP 7.13 - MANUAL CHECK: realtime, email, push, images

Type: Backend / tooling
  |  **MANUAL CHECK**

**1. Send this prompt (the agent prepares everything):**

```markdown
Read AGENTS.md, DECISIONS.md, PERFORMANCE.md and docs/API_CONTRACT.md first.

STEP 7.13 ONLY: prepare the full stack for the manual check. Do not change code unless a command fails.

Do exactly this:
1. Reset the dev databases, run migrations and all seeds, start docker services (postgres, redis, coturn, mailpit, minio) and everything with `pnpm dev:all`. Also run the workers.
2. Print the URLs: web http://localhost:3000, Mailpit http://localhost:8025, MinIO console http://localhost:9001, and the accounts.
3. Stop and wait for me.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**2. YOUR CHECKLIST - you do this by hand. Do NOT send it to the agent.**

| # | What to do | What you should see |
|---|---|---|
| 1 | Chat | Two browser profiles: guest and staff. Messages arrive both ways without refresh; typing dots; unread badge; reload keeps history. |
| 2 | Reconnect | Stop chat-service for 10 seconds: the banner 'Reconnecting...' appears and disappears after restart. |
| 3 | Call | Guest clicks Call, staff accepts: you hear audio both ways; mute works; End closes both sides; the thread shows 'Call ended'. |
| 4 | Email | Complete a booking payment: a confirmation email appears in Mailpit. |
| 5 | Expiry | Create a booking and do not pay: after 15 minutes (or change the expiry for testing) it becomes cancelled. |
| 6 | Push | Enable Notifications in the avatar menu as a guest; confirm a booking: a browser notification appears. |
| 7 | Images | As admin upload a photo to a room: it shows immediately; after a few seconds the 400 and 800 px variants exist in MinIO; the home card uses the small one. |
| 8 | Postman | Run the collection folders 00 to 07 again: all green. |

**3a. Everything passed -> send:**

```markdown
MANUAL CHECK PASSED for STEP 7.13 (MANUAL CHECK: realtime, email, push, images). Add one line to PROGRESS.md in the format `YYYY-MM-DD | STEP 7.13 | manual check passed: <what I checked in 6 to 10 words>` with today's date. Do not change anything else.
```

**3b. Something failed -> send the matching FAIL template from PROMPTS.md (section 6), filled in.**


---
