# PHASE 2 - FRONTEND GUEST PAGES

Everything a guest sees: rooms list, room detail, booking flow, my bookings. Still on mocks.

**Before you start:** the previous phase is finished (check PROGRESS.md). Work top to bottom, one step at a time.

**How to use this file:** copy ONLY the code blocks. Everything outside the code blocks is for you. One new agent chat per step is the safest (the agent re-reads the root files, it does not need old chat history).

Steps in this file:

- STEP 2.1 - Room card and grid
- STEP 2.2 - Home hero and search card
- STEP 2.3 - Filters, chips and pagination
- STEP 2.4 - Room detail: gallery and info
- STEP 2.5 - Room detail: booking card
- STEP 2.6 - Booking flow: steps 1 and 2
- STEP 2.7 - Booking flow: payment and result
- STEP 2.8 - My bookings
- STEP 2.9 - Review Phase 2 (review)

---

## STEP 2.1 - Room card and grid

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 2.1 ONLY: create the room card, its skeleton, the responsive grid and the rooms query hook.

Do exactly this:
1. src/features/rooms/components/RoomCard.tsx per DESIGN.md section 7 (4:3 image, title, meta, price, hover). Wrap in React.memo. The whole card is one focusable Link to /rooms/[id].
2. RoomCardSkeleton and RoomGrid (columns 1, 2, 3, 4 as in DESIGN.md section 4). Keys are room ids.
3. src/features/rooms/hooks/useRoomsQuery.ts with TanStack Query using the query key factory and the rooms endpoint; use placeholderData so pagination does not flash.
4. Temporarily render the grid on the home page with default params (page 1, limit 12), with loading (12 skeleton cards), empty and error (Alert with 'Try again') states.
5. Tests: card renders price format and link, grid shows skeletons while loading.
6. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 2.1 (Room card and grid): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 2.1 | what was done`. Do not change anything else.
```

---

## STEP 2.2 - Home hero and search card

Type: Frontend


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference.

STEP 2.2 ONLY: build the hero and the search card on the home page.

Do exactly this:
1. Hero per DESIGN.md section 8.1: photo /images/hero.webp through the RoomImage fallback (priority loading), flat 35% #14312C overlay, Display headline 'Find your room', one-line subtitle, 360px high (280 on mobile).
2. Search card overlapping the hero by 40px: RangePicker (earliest date today), guests stepper 1 to 6, room type Select, large primary 'Search'. Values come from and go to URL params (checkIn, checkOut, guests, type) through a client component with local form state; submit pushes the URL.
3. At 375px the card stacks vertically.
4. Tests: submitting builds the correct URL.
5. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 2.2 (Home hero and search card): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 2.2 | what was done`. Do not change anything else.
```

---

## STEP 2.3 - Filters, chips and pagination

Type: Frontend


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference.

STEP 2.3 ONLY: connect filters, chips, sorting and pagination to the URL and the list.

Do exactly this:
1. Room type Chips (All, Single, Double, Deluxe, Suite, Family) and price Chips (Under 10,000, 10,000 to 20,000, Over 20,000) bound to URL params. Selecting a chip resets page to 1. Sort Select: Price low to high, Price high to low, Room number.
2. Ant Design Pagination centered below the grid, bound to `page` in the URL, 12 per page, scroll to the top of the list on change.
3. The list reads ALL params from the URL (type, minPrice, maxPrice, guests, checkIn, checkOut, sort, page) and passes them to the query. Server-style pagination only, never slice on the client.
4. States: skeleton cards while loading, Empty 'No rooms match these filters' with a 'Clear filters' button, error Alert with 'Try again'.
5. Tests: chip click updates the URL, 'Clear filters' resets it.
6. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 2.3 (Filters, chips and pagination): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 2.3 | what was done`. Do not change anything else.
```

---

## STEP 2.4 - Room detail: gallery and info

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 2.4 ONLY: build the left column of the room detail page.

Do exactly this:
1. /rooms/[id] client page using a useRoomQuery(id) hook. Layout 8/4 columns per DESIGN.md section 8.2 (right column comes in the next step; leave an empty placeholder).
2. Gallery: main image 16:10 plus 4 thumbnails 4:3. Clicking a thumbnail swaps the main image. Clicking the main image opens the lightbox Modal (720) which is loaded with next/dynamic; arrow keys move, Esc closes, focus returns to the trigger.
3. Breadcrumb 'Rooms / Room 204', H1 title, meta row (type, capacity, room number), facilities as Tags with Outlined icons (known facilities map to icons, unknown ones get a check icon), description Body large with 'Read more' after 6 lines.
4. Loading Skeleton, 404 Result 'Room not found' for NOT_FOUND, error Alert with 'Try again'.
5. Tests: thumbnail swap, 404 state.
6. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 2.4 (Room detail: gallery and info): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 2.4 | what was done`. Do not change anything else.
```

---

## STEP 2.5 - Room detail: booking card

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 2.5 ONLY: build the sticky booking card and the availability check.

Do exactly this:
1. BookingCard in the right column (sticky top 88): price, RangePicker, guests stepper, availability line, large primary 'Book now'. Dates and guests start from URL params when present.
2. When both dates are set, call GET /rooms/:id/availability (debounced 300 ms). Show a success Tag 'Available' with nights, subtotal, tax and total, or an error Tag 'Not available for these dates'. 'Book now' is disabled until available.
3. Book now: logged out -> /login?next=<this page with dates>; guest -> save room and dates in bookingDraft and go to /book/[roomId]; staff or admin -> button disabled with Tooltip 'Guests only'.
4. Below 992px the card becomes a fixed bottom bar (72 high) with price and 'Book now'; dates are chosen in a Drawer.
5. Tests: availability states, redirect when logged out.
6. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 2.5 (Room detail: booking card): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 2.5 | what was done`. Do not change anything else.
```

---

## STEP 2.6 - Booking flow: steps 1 and 2

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 2.6 ONLY: build /book/[roomId] up to the guest details step.

Do exactly this:
1. Page in the (guest) group with the Steps component (Room, Details, Payment) per DESIGN.md section 8.4. bookingDraft in Redux holds the data. If the draft is empty or belongs to another room, redirect to the room page.
2. Step 1 'Room': summary of room, dates and guests with 'Change' links back to the room page; re-check availability when entering.
3. Step 2 'Details': Form with full name (prefilled), phone, email (prefilled), special requests (optional) using React Hook Form + Zod. Back (secondary) on the left, Continue (primary) on the right.
4. Summary card (4/12, sticky): 16:10 thumbnail, room, dates, guests, nights x price, tax, Total in the Price style. On mobile the summary sits above the form.
5. Persist only the bookingDraft slice in sessionStorage so a refresh keeps the draft.
6. Tests: step navigation and validation.
7. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 2.6 (Booking flow: steps 1 and 2): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 2.6 | what was done`. Do not change anything else.
```

---

## STEP 2.7 - Booking flow: payment and result

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 2.7 ONLY: build step 3, the payment waiting state and the result.

Do exactly this:
1. Step 3 'Payment': shows the total and the note 'Payment is confirmed by our payment provider.' Primary 'Pay now'.
2. Pay now: create the booking (POST /bookings with an Idempotency-Key UUID generated once per attempt and stored in the draft, so a double click or a retry is safe), then POST /bookings/:id/pay. The button shows loading and is blocked while running.
3. After pay: show a 'Waiting for payment confirmation' card with a Skeleton and poll GET /bookings/:id every 2 s (refetchInterval) until the status is confirmed or cancelled. After 60 s show an Alert 'We are still waiting for confirmation. You can check My bookings.'
4. Only when NEXT_PUBLIC_SHOW_DEV_PAYMENT=true: two small secondary buttons 'Simulate paid' and 'Simulate failed' that call the dev simulate endpoint.
5. Success: Result with the reference (BK-<id>), primary 'View booking' (to /my-bookings) and secondary 'Back to rooms'. Clear the draft.
6. 409 ROOM_NOT_AVAILABLE -> the Alert text from DESIGN.md section 8.4 with a link back to the room. Other errors -> toast; 422 -> field errors.
7. Tests: success flow on mocks, the 409 flow, the same idempotency key on retry.
8. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 2.7 (Booking flow: payment and result): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 2.7 | what was done`. Do not change anything else.
```

---

## STEP 2.8 - My bookings

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 2.8 ONLY: build /my-bookings.

Do exactly this:
1. Per DESIGN.md section 8.5: PageHeader, Tabs Upcoming (pending, confirmed, checked_in), Past (checked_out), Cancelled (cancelled), mapped to the `status` query param (comma-separated list is allowed).
2. Table columns: Booking (BK-id), Room, Dates (sortable), Status (StatusTag), Total (right aligned), Actions. Server pagination 10 per page in the URL. Skeleton rows, Empty 'No upcoming bookings' with 'Browse rooms', error Alert with 'Try again'.
3. Actions: 'View' opens a Drawer (420) with full details (dates, guests, price breakdown, payment status, status Tag). 'Cancel' (danger text button) with Popconfirm 'Cancel this booking?' calls cancel, toast on success, clear message on 409 INVALID_STATE. 'Pay now' for pending bookings reuses the payment-waiting logic from step 2.7 (extract a shared hook).
4. Below 768px show one card per booking instead of the table.
5. BookingRow is memoized, keys are booking ids, and cancel updates the cache with setQueryData.
6. Tests: tabs filter, cancel flow, pay-now flow.
7. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 2.8 (My bookings): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 2.8 | what was done`. Do not change anything else.
```

---

## STEP 2.9 - Review Phase 2

Type: Frontend
  |  **REVIEW**

_Send this only after every earlier step of this phase is finished._

**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference.

STEP 2.9 ONLY: review Phase 2 against the plan and fix differences. Do not add new features.

Do exactly this:
1. Produce a table: page (home, room detail, booking flow, my bookings), requirement from DESIGN.md section 8 and the matching wireframe in docs/design/hotel-platform-design-system.pdf, status (OK or Different).
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
Add one line to PROGRESS.md for STEP 2.9 (Review Phase 2): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 2.9 | what was done`. Do not change anything else.
```

---
