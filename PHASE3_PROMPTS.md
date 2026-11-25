# PHASE 3 - FRONTEND STAFF AND ADMIN, CHAT UI

Dashboard, management pages, reports, chat and call UI. Still on mocks. Ends with a manual browser check.

**Before you start:** the previous phase is finished (check PROGRESS.md). Work top to bottom, one step at a time.

**How to use this file:** copy ONLY the code blocks. Everything outside the code blocks is for you. One new agent chat per step is the safest (the agent re-reads the root files, it does not need old chat history).

Steps in this file:

- STEP 3.1 - Dashboard overview
- STEP 3.2 - Bookings management
- STEP 3.3 - Rooms table
- STEP 3.4 - Room form modal
- STEP 3.5 - Image upload UI
- STEP 3.6 - Staff management
- STEP 3.7 - Reports
- STEP 3.8 - Fake socket and chat data layer
- STEP 3.9 - Chat page
- STEP 3.10 - Call UI
- STEP 3.11 - Notification bell
- STEP 3.12 - Review Phase 3 (review)
- STEP 3.13 - FRONTEND CHECKPOINT (manual, browser) (manual check)

---

## STEP 3.1 - Dashboard overview

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 3.1 ONLY: build /dashboard (admin).

Do exactly this:
1. Per DESIGN.md section 8.7: 4 stat cards (Revenue, Bookings, Occupancy, Check-ins today) using the sales report (last 30 days), the occupancy report, and GET /bookings?status=confirmed&from=<today>&to=<today> for check-ins today. Cards: 4 per row at 1200px, 2 at 576px, 1 below.
2. Sales bar chart with Recharts, single color #1F4D45, gridlines #E7E5DF, white tooltip card, loaded with next/dynamic (ssr false) and a Skeleton fallback.
3. Recent bookings compact table (row 44, 5 rows) with StatusTag and a 'View all' text button to /dashboard/bookings.
4. Each block has its own loading Skeleton and error Alert; one failing block must not break the others.
5. Tests: cards show formatted values; the chart is lazy loaded.
6. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 3.1 (Dashboard overview): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 3.1 | what was done`. Do not change anything else.
```

---

## STEP 3.2 - Bookings management

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 3.2 ONLY: build /dashboard/bookings (staff and admin).

Do exactly this:
1. Title + filter bar: status Chips, RangePicker, search input (debounced, reference or guest name). Filters live in the URL.
2. Table: Reference, Guest, Room, Dates, Status, Total, Actions. Server pagination 10/20/50 in the URL, skeleton rows, Empty, error Alert.
3. Row actions by status: View (Drawer 420 with details), Check in (confirmed), Check out (checked_in), Cancel (Popconfirm). Buttons show loading, toast on success or failure, 409 INVALID_STATE shows a clear message. Update caches with setQueryData.
4. Below 768px: cards instead of the table. BookingRow memoized, keys by id.
5. Tests: filters in URL, action buttons per status, 409 message.
6. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 3.2 (Bookings management): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 3.2 | what was done`. Do not change anything else.
```

---

## STEP 3.3 - Rooms table

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 3.3 ONLY: build /dashboard/rooms (admin) without the form.

Do exactly this:
1. Per DESIGN.md section 8.8: title and primary 'Add room' (opens a placeholder Modal for now), filter bar (search by number, Type Select, Status Select) in the URL.
2. Table: thumbnail 56x40, Room, Type, Price right aligned, Status Tag (Active, Inactive), Edit (text) and Delete (danger text + Popconfirm 'Delete this room? This cannot be undone.'). Row 64. Server pagination. Uses includeInactive=true.
3. Delete calls DELETE /rooms/:id, toast, cache update. Skeleton rows, Empty, error Alert.
4. Tests: filters, delete flow.
5. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 3.3 (Rooms table): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 3.3 | what was done`. Do not change anything else.
```

---

## STEP 3.4 - Room form modal

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 3.4 ONLY: build the create and edit room form.

Do exactly this:
1. RoomFormModal (loaded with next/dynamic), width 520: number, type Select, price InputNumber (PKR, min 1,000), capacity InputNumber (1 to 8), facilities (Select in tags mode with suggestions: Wi-Fi, Air conditioning, Breakfast, TV, Mini fridge, Balcony, Parking), description Textarea, active Switch (edit only).
2. React Hook Form + createRoomSchema and updateRoomSchema from @hotel/shared. Footer: Cancel (secondary) then Save (primary, loading).
3. On success: toast 'Room saved', close, update the rooms query cache without a page reload. 409 ROOM_NUMBER_TAKEN -> error on the number field. Edit pre-fills from the room detail query.
4. Closing with unsaved changes asks Popconfirm 'Discard changes?'.
5. Tests: validation, create success, duplicate number error.
6. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 3.4 (Room form modal): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 3.4 | what was done`. Do not change anything else.
```

---

## STEP 3.5 - Image upload UI

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 3.5 ONLY: build the room image uploader (edit mode of the room form).

Do exactly this:
1. ImageUploader per DESIGN.md section 6: dashed drop area 120 high with hover state, click or drop, jpeg/png/webp up to 5 MB with clear error text. In create mode show the helper 'Save the room first, then add photos.'
2. Flow: POST /rooms/:id/images/upload-url -> PUT the file to uploadUrl with progress (axios onUploadProgress, 4px green progress bar) -> POST /rooms/:id/images. In mock mode skip the PUT and show a local object URL.
3. Thumbnail list (80x60, radius 8): 'Set as cover' text button, Delete icon button (aria-label, Popconfirm). The cover has a 'Cover' Tag. Per-file error under the thumbnail with a Retry.
4. Tests: type and size validation, order of the calls.
5. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 3.5 (Image upload UI): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 3.5 | what was done`. Do not change anything else.
```

---

## STEP 3.6 - Staff management

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 3.6 ONLY: build /dashboard/staff (admin).

Do exactly this:
1. Title and primary 'Add staff'. Table: Name, Email, Created, Actions (Delete with Popconfirm). Server pagination, skeleton rows, Empty, error Alert.
2. StaffFormModal (dynamic import): name, email, password with rule helper text; React Hook Form + Zod; 409 EMAIL_TAKEN on the email field.
3. Toasts, cache updates, cards below 768px.
4. Tests: create, duplicate email, delete.
5. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 3.6 (Staff management): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 3.6 | what was done`. Do not change anything else.
```

---

## STEP 3.7 - Reports

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 3.7 ONLY: build /dashboard/reports (admin).

Do exactly this:
1. RangePicker with presets (Last 7 days, Last 30 days, This month), default last 30 days, stored in the URL.
2. Two blocks: Sales (Statistic total revenue and bookings + bar chart by day) and Occupancy (Statistic occupancy rate + chart by day). Charts are dynamically imported and follow the single-color rule in DESIGN.md.
3. A daily data table under each chart (Date, Revenue and Bookings / Occupied rooms and Rate), 10 rows per page.
4. Loading, empty ('No bookings in this period') and error states per block.
5. Tests: preset changes the query, empty state.
6. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 3.7 (Reports): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 3.7 | what was done`. Do not change anything else.
```

---

## STEP 3.8 - Fake socket and chat data layer

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 3.8 ONLY: create the socket abstraction, the mock chat module and the chat data wiring. No chat page yet.

Do exactly this:
1. src/lib/socket/index.ts: a `SocketClient` interface (connect, disconnect, emit with ack, on, off) with two implementations: MockSocket (src/mocks/socket.ts, in-memory event bus that simulates message:send ack and delivery, a staff auto-reply after 1.5 s, typing events, conversation:updated, and call events answered after 2 s) and RealSocket (socket.io-client, path /socket.io, withCredentials, URL from NEXT_PUBLIC_SOCKET_URL). The chat mock flag chooses the implementation.
2. src/mocks/handlers/chat.ts: REST handlers (create conversation, list per role, messages with cursor pagination) with seed data: 3 conversations for the staff view, some with unread counts, one with 150 messages for virtualization tests.
3. SocketProvider: the only allowed Context besides the theme. It exposes the client instance and is mounted only for logged-in users.
4. Wire events to state: message:new -> update unread counts in the chat slice and setQueryData on the messages cache (de-duplicate by id); typing -> chat slice; conversation:updated -> conversations cache.
5. Tests for the mock socket and the cache updates.
6. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 3.8 (Fake socket and chat data layer): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 3.8 | what was done`. Do not change anything else.
```

---

## STEP 3.9 - Chat page

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 3.9 ONLY: build /chat (guest) and /dashboard/chat (staff and admin).

Do exactly this:
1. Per DESIGN.md section 7 'Chat' and 8.6. Guest: one thread (create or reuse the open conversation). Staff: conversation list (320) + thread; below 768px list and thread are separate screens.
2. Thread: header (name, online dot, 'Call' secondary button, wired in step 3.10), bubbles with grouping, timestamps and date pills. Virtualize with TanStack Virtual (variable heights, newest at the bottom, auto-scroll, 'New messages' pill when scrolled up, load older messages with the cursor when reaching the top).
3. ChatMessage is React.memo, keys are message ids.
4. Input bar: grows to 4 lines, Enter sends, Shift+Enter adds a line, Send icon button. Optimistic message with a sending state and a failed state with 'Retry'. Typing start and stop are debounced.
5. Opening a conversation sends conversation:read and clears its unread count.
6. Loading skeleton, empty ('No messages yet. Say hello.'), error Alert.
7. Tests: grouping, Enter vs Shift+Enter, optimistic send.
8. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 3.9 (Chat page): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 3.9 | what was done`. Do not change anything else.
```

---

## STEP 3.10 - Call UI

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 3.10 ONLY: build the call popup with a mock engine. No real audio yet.

Do exactly this:
1. CallPopup (loaded with next/dynamic, mounted in the app shell) per DESIGN.md section 7: states idle, ringing (incoming and outgoing), connected, ended. Driven by the Redux call slice and the socket call events. Fixed bottom-right 320 wide, bottom sheet on mobile.
2. Controls: Accept (primary), Decline (danger outline), Mute (icon, secondary, toggles), End (danger round icon), timer mm:ss while connected. The thread header 'Call' button starts an outgoing call.
3. Audio logic sits behind a `CallEngine` interface with a `MockCallEngine` (no media), so real WebRTC can be added in phase 7 without touching the UI.
4. When a call ends add a system pill in the thread ('Call ended 02:14').
5. Accessibility: role='dialog', aria-live status text, aria-labels on icon buttons; Esc does not end a call.
6. Tests: call state machine transitions.
7. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 3.10 (Call UI): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 3.10 | what was done`. Do not change anything else.
```

---

## STEP 3.11 - Notification bell

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 3.11 ONLY: build the header notification bell.

Do exactly this:
1. Bell with Badge and a Dropdown list (max 10, newest first, 'Mark all read'). Items: new chat message, booking status changes (guest: confirmed, cancelled; staff and admin: new booking).
2. New Redux slice `notifications` (items with id, type, text, createdAt, read) fed by socket events and booking query updates. No REST. Add the slice to the store with tests.
3. Ant Design `notification` toast (top right) for a new chat message when the user is not on that thread.
4. Empty text 'No notifications'. Keyboard accessible.
5. Tests: feed, mark all read.
6. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 3.11 (Notification bell): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 3.11 | what was done`. Do not change anything else.
```

---

## STEP 3.12 - Review Phase 3

Type: Frontend
  |  **REVIEW**

_Send this only after every earlier step of this phase is finished._

**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference.

STEP 3.12 ONLY: review Phase 3 against the plan and fix differences. Do not add new features.

Do exactly this:
1. Produce a table: page (dashboard overview, bookings management, rooms, staff, reports, chat, call popup, notification bell), requirement from DESIGN.md section 8 and the matching wireframe in docs/design/hotel-platform-design-system.pdf, status (OK or Different).
2. Check every frontend rule in PERFORMANCE.md (1 to 15). Report each rule as OK or Different. Search src for: store-wide selectors, Context used for shared data, array index used as `key`, missing `React.memo` on RoomCard/BookingRow/ChatMessage, client-side slicing of lists, charts or lightbox not dynamically imported.
3. Check loading, empty and error states exist on every page in the table, and that the UI uses Skeleton for lists, Spinner only inside buttons, toast (message) for short results and Alert for persistent problems (DESIGN.md section 7).
4. Check roles: guest, staff and admin can open only their own routes (DECISIONS.md routes table). Check what happens for a logged-out user and for the wrong role.
5. Check 375px and 768px widths on every page in the table: no sideways page scroll, tables become cards or scroll inside their own container, buttons and inputs reach 44px touch height.
6. Search src for hard-coded hex colors, inline color styles, gradients, emoji characters in JSX, `any`, and `console.log`. Fix them (colors only from tokens).
7. Check contrast and keyboard navigation on these pages: Tab order, visible focus outline, Esc closes modals and drawers, focus returns to the trigger, icon-only buttons have aria-label.
8. Fix every Different item. Do not add new features.
9. Run lint, typecheck, tests and `pnpm --filter web build`.

Stop after this step. Report the tables, what you fixed, and what still differs and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 3.12 (Review Phase 3): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 3.12 | what was done`. Do not change anything else.
```

---

## STEP 3.13 - FRONTEND CHECKPOINT (manual, browser)

Type: Frontend
  |  **MANUAL CHECK**

**1. Send this prompt (the agent prepares everything):**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference.

STEP 3.13 ONLY: prepare the frontend checkpoint. Do not change code unless a command fails.

Do exactly this:
1. Run `pnpm --filter web build` and fix only build failures.
2. Start `pnpm --filter web dev` in mock mode and wait until it is ready.
3. Print: the URL, the three seed accounts (from API_CONTRACT section 9), and a list of all routes with the role that may open each.
4. Stop and wait for me. Do not close the dev server.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**2. YOUR CHECKLIST - you do this by hand. Do NOT send it to the agent.**

| # | What to do | What you should see |
|---|---|---|
| 1 | Home `/` | 12 room cards appear after skeletons; hero, search card and chips look like the PDF. |
| 2 | Filters | Click Suite, then 'Under 10,000'; URL changes; 'Clear filters' resets; pagination works. |
| 3 | Room detail | Gallery swap, lightbox opens and Esc closes, dates show availability, 'Book now' disabled until available. |
| 4 | Book as guest@example.com | All 3 steps; Pay now; 'Waiting' card; after about 3 seconds the success Result with BK-reference. |
| 5 | Double booking | Book the same room and dates again: the 409 Alert appears. |
| 6 | My bookings | Tabs, Drawer details, Cancel with Popconfirm. |
| 7 | Staff (staff@example.com) | Lands on /dashboard/bookings; Check in and Check out work; /dashboard/rooms shows the 403 page. |
| 8 | Admin (admin@example.com) | Dashboard cards and chart; create a room with the form; open edit; upload an image; add and delete staff; reports change with the presets. |
| 9 | Chat | Guest sends a message, staff auto-reply arrives; typing dots; 'Call' shows the popup states. |
| 10 | Responsive | Browser width 375px: no sideways scroll, menus become drawers, tables become cards. |
| 11 | Keyboard | Tab through the home page and a modal: focus is always visible, Esc closes modals. |

**3a. Everything passed -> send:**

```markdown
MANUAL CHECK PASSED for STEP 3.13 (FRONTEND CHECKPOINT (manual, browser)). Add one line to PROGRESS.md in the format `YYYY-MM-DD | STEP 3.13 | manual check passed: <what I checked in 6 to 10 words>` with today's date. Do not change anything else.
```

**3b. Something failed -> send the matching FAIL template from PROMPTS.md (section 6), filled in.**


---
