# PROMPTS.md - how to use this pack

This pack lets a coding agent (Antigravity) build the Hotel Booking Platform in 97 small steps. **Frontend first** (on a mock API), then the **backend** (you test the APIs by hand in Postman at checkpoints), then everything is connected, then production.

You send one small prompt at a time. After each prompt you send a tiny second prompt that writes one line into PROGRESS.md, so you always know where you stopped.

## 1. Where every file goes

Unzip the pack into the **root of your repository** (the folder that contains README.md). You get:

```
hotel-management/                (your repo root)
  AGENTS.md                      rules for the agent (read first, every step)
  DECISIONS.md                   fixed decisions (stack, roles, routes, statuses)
  DESIGN.md                      full UI rules (colors, fonts, buttons, pages)
  PERFORMANCE.md                 performance rules checked in every review
  PROGRESS.md                    one line per finished step (the agent edits only this)
  PROMPTS.md                     this file
  PHASE0_PROMPTS.md ... PHASE8_PROMPTS.md    the step prompts, in order
  docs/
    API_CONTRACT.md              the API (endpoints, shapes, errors, events)
    design/
      hotel-platform-design-system.pdf    wireframes + design system (visual reference)
      hotel-platform-documentation.pdf    full technical documentation
      images/                    (empty) put design reference images here if you add any
  postman/
    hotel-platform.postman_collection.json
    hotel-platform.postman_environment.json
```
Do not rename files. The prompts refer to these exact names.
If the agent cannot read a PDF it falls back to DESIGN.md and says so. DESIGN.md contains the full text of the design rules.

## 2. First time (do once)
1. Unzip into the repo root. Check the tree above.
2. Open your IDE terminal and run `git status`; commit the pack: `git add . && git commit -m "Add project rules, prompts and docs"`.
3. Make sure Node 20+ and pnpm are installed (`node -v`, `pnpm -v`). Docker Desktop is needed from Phase 4.
4. Open `PHASE0_PROMPTS.md`, start with STEP 0.1.

## 3. The loop (for every step)
1. Open `PROGRESS.md`, find the last finished step, open the next step in the matching `PHASE*_PROMPTS.md` file.
2. Start a **new chat** with the agent (recommended).
3. Copy the code block under **Send this prompt** and paste it. Nothing else.
4. Read the agent's report. Run the app or the tests yourself if you want. If something is wrong, tell the agent in plain words (or use a FAIL template) before moving on.
5. Send the code block under **After the agent's report is good** (the progress prompt).
6. Commit yourself: `git add . && git commit -m "STEP x.y: <title>" && git push`.

## 4. Which prompts to send, and which not
| Send | Do NOT send |
|---|---|
| The code block named "Send this prompt" | The text around the code blocks (headings, notes) |
| The code block named "After the agent's report is good" | The "YOUR CHECKLIST" tables (those are for you) |
| PASS or FAIL templates for MANUAL CHECK steps | A review step before all steps of its phase are finished |
| One step at a time, in order | Two steps in one message, or a later phase before the earlier phase review is OK |
| Answer yes or no when the agent asks about a new library | Edits to AGENTS.md, DECISIONS.md, DESIGN.md, PERFORMANCE.md by the agent (only you change those) |

## 5. Manual check steps (8 of them)
They are marked **MANUAL CHECK**. The agent only prepares the environment (migrations, seeds, running services) and stops. You test by hand in Postman (backend) or the browser (frontend) using the checklist in the step. Postman setup: import both files from `postman/`, choose the environment "Hotel Platform - Local", set `host_url` to `http://localhost:8080` (the dev gateway). Cookies are handled by Postman; to switch role, run the matching Login request again.
Manual check steps: 3.13, 4.13, 5.5, 5.13, 6.6, 7.13, 8.10, 8.13.

## 6. Template prompts

**Resume in a new session (when you forgot where you are):**
```markdown
Read PROGRESS.md and PROMPTS.md. Tell me which step is the next one to do and in which file its prompt is. Do not change any files.
```

**FAIL template - backend (Postman):**
```markdown
MANUAL CHECK FAILED in STEP <id>.
Request: <Postman request name>
Expected: <status and body>
Actual: <paste the status and the response body>

Fix only this problem. Find the cause, fix it in the code (not in the Postman collection unless the collection is clearly wrong), add a test that would have caught it, run lint, typecheck and tests, then stop. Report the cause and the fix.
```

**FAIL template - frontend (browser):**
```markdown
CHECK FAILED in STEP <id>.
Page: <route>
What I did: <steps>
Expected: <what should happen>
Actual: <what happened; add the browser console error if any>

Fix only this problem. Find the cause, fix it, add a test if it can be tested, run lint, typecheck, tests and the web build, then stop. Report the cause and the fix.
```

**"Agent changed too much" template:**
```markdown
You changed things outside the step. Revert everything that is not part of STEP <id>, list what you reverted, and run lint, typecheck and tests. Do not add anything new.
```

## 7. Images you generate yourself
The agent never generates photos. It builds the UI with a neutral placeholder block when a file is missing, so you can add images at any time. Put these files in `apps/web/public/images/` (WebP, no text, no watermark, no faces):

| File | Size (px) | What it shows |
|---|---|---|
| `hero.webp` | 1920 x 1080 | Hotel exterior or lobby, bright natural light (home hero) |
| `login.webp` | 1200 x 1600 (portrait) | Calm corridor, lobby or room detail (login side panel) |
| `rooms/room-01-1.webp` ... `room-04-1.webp` | 1600 x 1000 | Rooms 101-104 (Single/Double). `-1` is the cover (cards use a 4:3 crop of it) |
| `rooms/room-05-1.webp` ... `room-08-1.webp` | 1600 x 1000 | Rooms 201-204 (Deluxe) |
| `rooms/room-09-1.webp`, `room-10-1.webp` | 1600 x 1000 | Rooms 301-302 (Suite) |
| `rooms/room-11-1.webp`, `room-12-1.webp` | 1600 x 1000 | Rooms 210-211 (Family) |
| `rooms/room-NN-2.webp`, `room-NN-3.webp` | 1600 x 1000 | Optional extra angles (bathroom, window view) for each room |
Minimum useful set: hero, login and the 12 cover images (14 files). The numbers follow the room order in the mock data: 101, 102, 103, 104, 201, 202, 203, 204, 301, 302, 210, 211.

## 8. Phase map
| Phase | You get at the end | Manual check |
|---|---|---|
| 0 Setup | pnpm workspace, tooling, shared Zod schemas, minimal CI | - |
| 1 Frontend foundation | Next.js app, theme, Redux, API client, full mock API, layouts, login | review only |
| 2 Guest pages | rooms, room detail, booking flow, my bookings (on mocks) | review only |
| 3 Staff, admin, chat UI | dashboard, management pages, reports, chat, call UI (on mocks) | **3.13 browser** |
| 4 Backend foundation + Auth | Docker DB, dev gateway, service kit, Auth Service | **4.13 Postman** |
| 5 Room and Booking services | rooms, bookings, payment webhook, reports | **5.5** and **5.13 Postman** |
| 6 Connect | real API in the UI, error handling, contract check, Newman | **6.6 browser** |
| 7 Realtime and more | chat, WebRTC audio, queues, email, push, images | **7.13** |
| 8 Production | Docker, Nginx gateway, PM2, Sentry, CI/CD, AWS guide, audits | **8.10**, **8.13** |

## 9. All steps (tick them as you finish; PROGRESS.md is the official log)
### Phase 0 - Setup  (`PHASE0_PROMPTS.md`)
- [ ] STEP 0.1 - Workspace skeleton
- [ ] STEP 0.2 - TypeScript, ESLint and Prettier
- [ ] STEP 0.3 - Shared package (schemas and types)
- [ ] STEP 0.4 - Minimal CI

### Phase 1 - Frontend foundation  (`PHASE1_PROMPTS.md`)
- [ ] STEP 1.1 - Create the web app
- [ ] STEP 1.2 - Tailwind v3, fonts and global styles
- [ ] STEP 1.3 - Ant Design theme
- [ ] STEP 1.4 - UI primitives
- [ ] STEP 1.5 - Redux Toolkit and Query providers
- [ ] STEP 1.6 - API client
- [ ] STEP 1.7 - Mock layer and auth mocks
- [ ] STEP 1.8 - Mock rooms
- [ ] STEP 1.9 - Mock bookings, payments, reports
- [ ] STEP 1.10 - Layout shells and role guard
- [ ] STEP 1.11 - Login and register pages
- [ ] STEP 1.12 - Review Phase 1  [review]

### Phase 2 - Frontend guest pages  (`PHASE2_PROMPTS.md`)
- [ ] STEP 2.1 - Room card and grid
- [ ] STEP 2.2 - Home hero and search card
- [ ] STEP 2.3 - Filters, chips and pagination
- [ ] STEP 2.4 - Room detail: gallery and info
- [ ] STEP 2.5 - Room detail: booking card
- [ ] STEP 2.6 - Booking flow: steps 1 and 2
- [ ] STEP 2.7 - Booking flow: payment and result
- [ ] STEP 2.8 - My bookings
- [ ] STEP 2.9 - Review Phase 2  [review]

### Phase 3 - Frontend staff and admin, chat UI  (`PHASE3_PROMPTS.md`)
- [ ] STEP 3.1 - Dashboard overview
- [ ] STEP 3.2 - Bookings management
- [ ] STEP 3.3 - Rooms table
- [ ] STEP 3.4 - Room form modal
- [ ] STEP 3.5 - Image upload UI
- [ ] STEP 3.6 - Staff management
- [ ] STEP 3.7 - Reports
- [ ] STEP 3.8 - Fake socket and chat data layer
- [ ] STEP 3.9 - Chat page
- [ ] STEP 3.10 - Call UI
- [ ] STEP 3.11 - Notification bell
- [ ] STEP 3.12 - Review Phase 3  [review]
- [ ] STEP 3.13 - FRONTEND CHECKPOINT (manual, browser)  **[MANUAL CHECK]**

### Phase 4 - Backend foundation and Auth Service  (`PHASE4_PROMPTS.md`)
- [ ] STEP 4.1 - Docker, environment and checks
- [ ] STEP 4.2 - Dev gateway
- [ ] STEP 4.3 - Service kit (shared backend code)
- [ ] STEP 4.4 - Auth service scaffold
- [ ] STEP 4.5 - Migrations, tables and seed (auth)
- [ ] STEP 4.6 - Auth: register
- [ ] STEP 4.7 - Auth: login and tokens
- [ ] STEP 4.8 - Auth: me, refresh, logout
- [ ] STEP 4.9 - Auth: staff management
- [ ] STEP 4.10 - Auth: rate limiting
- [ ] STEP 4.11 - Auth: OpenAPI docs
- [ ] STEP 4.12 - Review Phase 4 (auth)  [review]
- [ ] STEP 4.13 - MANUAL CHECK: Auth in Postman  **[MANUAL CHECK]**

### Phase 5 - Room and Booking services  (`PHASE5_PROMPTS.md`)
- [ ] STEP 5.1 - Room service: scaffold, tables, seed
- [ ] STEP 5.2 - Room service: list and detail
- [ ] STEP 5.3 - Room service: Redis cache
- [ ] STEP 5.4 - Room service: admin CRUD
- [ ] STEP 5.5 - MANUAL CHECK: Rooms in Postman  **[MANUAL CHECK]**
- [ ] STEP 5.6 - Booking service: scaffold, tables, constraint
- [ ] STEP 5.7 - Booking service: create booking
- [ ] STEP 5.8 - Booking service: read, cancel, staff actions
- [ ] STEP 5.9 - Booking service: payment and webhook
- [ ] STEP 5.10 - Availability between services
- [ ] STEP 5.11 - Booking service: reports
- [ ] STEP 5.12 - Review Phase 5 (rooms and bookings)  [review]
- [ ] STEP 5.13 - MANUAL CHECK: Bookings, webhook, negative tests  **[MANUAL CHECK]**

### Phase 6 - Connect frontend to the real API  (`PHASE6_PROMPTS.md`)
- [ ] STEP 6.1 - Connect auth (real)
- [ ] STEP 6.2 - Connect rooms (real)
- [ ] STEP 6.3 - Connect bookings and payment (real)
- [ ] STEP 6.4 - Real error handling pass
- [ ] STEP 6.5 - Contract check script
- [ ] STEP 6.6 - MANUAL CHECK: full flow in the browser  **[MANUAL CHECK]**
- [ ] STEP 6.7 - Review Phase 6 and Newman  [review]

### Phase 7 - Realtime, queues, notifications, images  (`PHASE7_PROMPTS.md`)
- [ ] STEP 7.1 - Chat service: scaffold, tables, REST
- [ ] STEP 7.2 - Chat service: Socket.IO server
- [ ] STEP 7.3 - Frontend: real chat
- [ ] STEP 7.4 - Call signaling and TURN
- [ ] STEP 7.5 - Frontend: WebRTC audio
- [ ] STEP 7.6 - Notification service: BullMQ and email
- [ ] STEP 7.7 - Booking events to jobs, expiry
- [ ] STEP 7.8 - Web push
- [ ] STEP 7.9 - Image storage (S3 / MinIO)
- [ ] STEP 7.10 - Image resize worker
- [ ] STEP 7.11 - Frontend: real image upload
- [ ] STEP 7.12 - Review Phase 7  [review]
- [ ] STEP 7.13 - MANUAL CHECK: realtime, email, push, images  **[MANUAL CHECK]**

### Phase 8 - Production, deploy, final checks  (`PHASE8_PROMPTS.md`)
- [ ] STEP 8.1 - Dockerfiles
- [ ] STEP 8.2 - Nginx API gateway
- [ ] STEP 8.3 - PM2 and graceful shutdown
- [ ] STEP 8.4 - Sentry and logging audit
- [ ] STEP 8.5 - Security hardening audit
- [ ] STEP 8.6 - Backups
- [ ] STEP 8.7 - Full CI
- [ ] STEP 8.8 - CD to EC2
- [ ] STEP 8.9 - DEPLOY.md (AWS guide)
- [ ] STEP 8.10 - MANUAL: AWS setup by the owner  **[MANUAL CHECK]**
- [ ] STEP 8.11 - Final audits
- [ ] STEP 8.12 - Final documentation
- [ ] STEP 8.13 - MANUAL CHECK: production smoke test  **[MANUAL CHECK]**

