# PHASE 1 - FRONTEND FOUNDATION

Next.js app, design tokens, Ant Design theme, Redux, API client, a complete mock API, layouts and login. Backend does not exist yet; everything runs on mocks.

**Before you start:** the previous phase is finished (check PROGRESS.md). Work top to bottom, one step at a time.

**How to use this file:** copy ONLY the code blocks. Everything outside the code blocks is for you. One new agent chat per step is the safest (the agent re-reads the root files, it does not need old chat history).

Steps in this file:

- STEP 1.1 - Create the web app
- STEP 1.2 - Tailwind v3, fonts and global styles
- STEP 1.3 - Ant Design theme
- STEP 1.4 - UI primitives
- STEP 1.5 - Redux Toolkit and Query providers
- STEP 1.6 - API client
- STEP 1.7 - Mock layer and auth mocks
- STEP 1.8 - Mock rooms
- STEP 1.9 - Mock bookings, payments, reports
- STEP 1.10 - Layout shells and role guard
- STEP 1.11 - Login and register pages
- STEP 1.12 - Review Phase 1 (review)

---

## STEP 1.1 - Create the web app

Type: Frontend


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference.

STEP 1.1 ONLY: create the Next.js app in apps/web with placeholder routes.

Do exactly this:
1. Create apps/web (package name `web`) with Next.js latest stable: App Router, TypeScript, `src/` directory, ESLint, import alias `@/*`. Do NOT enable Tailwind in the generator (Tailwind v3 is installed in the next step).
2. Add `@hotel/shared` as a workspace dependency and prove the import works (read a role constant in a server component, then remove it).
3. Create route groups with placeholder pages (only the route name as text): `(public)/page.tsx`, `(public)/rooms/[id]`, `(auth)/login`, `(auth)/register`, `(guest)/book/[roomId]`, `(guest)/my-bookings`, `(guest)/chat`, `(dashboard)/dashboard`, `(dashboard)/dashboard/bookings`, `rooms`, `staff`, `reports`, `chat` (routes as in DECISIONS.md).
4. Create apps/web/.env.example with: NEXT_PUBLIC_USE_MOCKS=true, NEXT_PUBLIC_MOCK_MODULES=auth,rooms,bookings,chat, NEXT_PUBLIC_MOCK_LATENCY=400, NEXT_PUBLIC_API_URL=/api/v1, NEXT_PUBLIC_IMAGE_BASE_URL=/images, NEXT_PUBLIC_SHOW_DEV_PAYMENT=true. Copy it to .env.local.
5. Scripts: dev, build, start, lint, typecheck (tsc --noEmit).
6. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 1.1 (Create the web app): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 1.1 | what was done`. Do not change anything else.
```

---

## STEP 1.2 - Tailwind v3, fonts and global styles

Type: Frontend


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference.

STEP 1.2 ONLY: install Tailwind CSS v3 and apply the design tokens. No components yet.

Do exactly this:
1. Install tailwindcss@3, postcss and autoprefixer in apps/web. Create tailwind.config.js and postcss.config.js using the config in DESIGN.md section 12 (preflight disabled, custom screens).
2. Load Inter and Fraunces with `next/font/google` in the root layout (CSS variables --font-inter and --font-fraunces, display swap, Fraunces weights 500 and 600). Put both variables on the <html> element.
3. Create src/app/globals.css: the three @tailwind directives, the CSS from DESIGN.md section 12 (focus-visible, body, headings, tabular, reduced motion) and a minimal reset (box-sizing border-box, body margin 0, img and svg max-width 100%).
4. Create the temporary page src/app/design-check/page.tsx (it is removed in step 8.11) showing: every color token with name and hex, the type scale with real classes, the spacing scale as bars, radius and shadow samples. Tailwind classes only.
5. Compare it with sections 2, 3 and 4 of docs/design/hotel-platform-design-system.pdf and correct differences.
6. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 1.2 (Tailwind v3, fonts and global styles): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 1.2 | what was done`. Do not change anything else.
```

---

## STEP 1.3 - Ant Design theme

Type: Frontend


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference.

STEP 1.3 ONLY: install Ant Design v5 and apply the theme. No product components yet.

Do exactly this:
1. Install antd@5, @ant-design/nextjs-registry and @ant-design/icons in apps/web. If React 19 needs it, also install @ant-design/v5-patch-for-react-19 and tell me.
2. Create src/providers/AntdProvider.tsx: AntdRegistry + ConfigProvider with exactly the theme object from DESIGN.md section 12. Wrap the root layout with it. Check there is no style flash on reload and no clash with Tailwind.
3. Extend /design-check with an 'Ant Design' section: Button (primary, default, text, danger, danger outline) in small, middle and large, plus disabled and loading; Input in default, error and disabled; Select; DatePicker.RangePicker; a Table with 3 rows; Modal, Drawer and Popconfirm triggers; message and notification triggers; Steps; Skeleton; Empty; Result.
4. Compare hover, pressed, focus, disabled and loading looks with DESIGN.md sections 5 and 6 and the button-state diagram in the PDF. Fix differences with theme tokens or a few lines in globals.css (no inline hex in components).
5. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 1.3 (Ant Design theme): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 1.3 | what was done`. Do not change anything else.
```

---

## STEP 1.4 - UI primitives

Type: Frontend


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference.

STEP 1.4 ONLY: create the small shared UI components in src/components/ui. No pages yet.

Do exactly this:
1. Chip (controlled toggle, selected state with check icon, all states from DESIGN.md section 5), StatusTag (booking and payment statuses with dot and colors from section 7), PageHeader (title, subtitle, action slot, H1 and H3 variants), EmptyState and ErrorState (wrappers around Empty and Result/Alert with title, description, action and a retry button), Price (PKR format with thousands separators, serif, optional 'per night').
2. RoomImage: wrapper around next/image with fixed width and height, blur placeholder, and a neutral #EFEDE6 fallback block with a muted icon when the file is missing or fails to load. URL helper in src/lib/images.ts builds URLs from NEXT_PUBLIC_IMAGE_BASE_URL.
3. src/lib/format.ts: formatPrice, formatDate, formatDateRange, bookingReference (BK-<id>), plural helper. Use Intl with the en-GB locale.
4. Add all of them to /design-check.
5. Vitest tests for the format helpers and the StatusTag status-to-style mapping.
6. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 1.4 (UI primitives): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 1.4 | what was done`. Do not change anything else.
```

---

## STEP 1.5 - Redux Toolkit and Query providers

Type: Frontend


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference.

STEP 1.5 ONLY: set up client state and server state providers.

Do exactly this:
1. Install @reduxjs/toolkit, react-redux, @tanstack/react-query and @tanstack/react-query-devtools (dev use only, dynamically imported).
2. src/store/index.ts (makeStore, safe for Next.js) and src/store/hooks.ts (typed useAppDispatch and useAppSelector).
3. Slices in src/store/slices: auth {user, status: idle|loading|authenticated|unauthenticated}; ui {sidebarCollapsed, mobileMenuOpen}; bookingDraft {roomId, checkIn, checkOut, guests, guestDetails, idempotencyKey, step} with a reset action; chat {activeConversationId, unreadByConversation, typingByConversation}; call {status: idle|ringing|connected|ended, conversationId, direction, startedAt}.
4. Export one narrow selector per field. Use `createSelector` only for derived data (for example total unread). Never export a selector that returns a whole slice.
5. src/providers/AppProviders.tsx: Redux Provider + QueryClientProvider (staleTime 30 s, retry 1, refetchOnWindowFocus false) + AntdProvider. Use it in the root layout.
6. Set up Vitest and React Testing Library for apps/web (jsdom, setup file, path alias). Write at least 2 reducer tests per slice.
7. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 1.5 (Redux Toolkit and Query providers): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 1.5 | what was done`. Do not change anything else.
```

---

## STEP 1.6 - API client

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 1.6 ONLY: create the typed API client. Do not create mocks yet.

Do exactly this:
1. Install axios in apps/web.
2. src/lib/api/client.ts: axios instance, baseURL from NEXT_PUBLIC_API_URL (default /api/v1), withCredentials true, 15 s timeout, an `x-request-id` (uuid) header on every request.
3. Response interceptor: on 401 TOKEN_EXPIRED call POST /auth/refresh once (one shared promise so parallel requests wait), then retry the original request. If refresh fails, clear the auth state and redirect to /login?next=<current path>.
4. Error normalizer: every failure becomes `ApiClientError { status, code, message, details?, requestId? }` based on the envelope in docs/API_CONTRACT.md. Network errors get code NETWORK_ERROR.
5. src/lib/api/endpoints/*.ts: one typed function per endpoint in API_CONTRACT sections 3, 4, 5 and 6 (REST part). Types and Zod schemas come from @hotel/shared. In development, parse responses with the shared schemas and log a warning on mismatch; do not parse in production.
6. src/lib/api/queryKeys.ts: key factory (rooms.list(params), rooms.detail(id), bookings.my(params), bookings.list(params), bookings.detail(id), reports.sales(params), chat.conversations(), chat.messages(id), staff.list(params)).
7. Tests with a mocked adapter: normal call, 422 mapping with details, 401 refresh then retry succeeds, refresh failure logs out, NETWORK_ERROR.
8. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 1.6 (API client): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 1.6 | what was done`. Do not change anything else.
```

---

## STEP 1.7 - Mock layer and auth mocks

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 1.7 ONLY: create the mock API infrastructure and the auth module mocks.

Do exactly this:
1. Install axios-mock-adapter in apps/web.
2. src/mocks/index.ts: `setupMocks(client)` reads NEXT_PUBLIC_USE_MOCKS and NEXT_PUBLIC_MOCK_MODULES, registers handlers only for the listed modules (auth, rooms, bookings, chat) and passes every other request through to the real network. Load it with a dynamic import only when the flag is true, client side only, before the first request.
3. src/mocks/db.ts: in-memory db with the three seed users from API_CONTRACT section 9, session handling, helpers for the envelope, pagination meta and contract errors. Add artificial latency from NEXT_PUBLIC_MOCK_LATENCY (default 400 ms) so loading states are visible.
4. src/mocks/handlers/auth.ts: register (409 EMAIL_TAKEN, 422 with details), login (401 'Email or password is incorrect'), refresh, logout, me, staff list/create/delete with role rules (403 for non-admin, 401 when logged out). Login sets the cookie `mock_role=<role>` with document.cookie; logout clears it.
5. Bootstrap the Redux auth slice on app start: call GET /auth/me, set user or unauthenticated.
6. Tests for the auth handlers: success and every error case.
7. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 1.7 (Mock layer and auth mocks): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 1.7 | what was done`. Do not change anything else.
```

---

## STEP 1.8 - Mock rooms

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 1.8 ONLY: create the mock rooms module.

Do exactly this:
1. src/mocks/seed/rooms.ts: 12 rooms in this order: 101, 102, 103, 104 (Single/Double), 201, 202, 203, 204 (Deluxe), 301, 302 (Suite), 210, 211 (Family). Prices PKR 6,000 to 30,000, realistic capacity and facilities, short plain-language descriptions. Image keys `rooms/room-<NN>-<1..3>.webp` where NN is the position 01 to 12 in that order; image 1 is the cover. URLs come from the image helper (all three sizes point to the same file for now).
2. src/mocks/handlers/rooms.ts: GET /rooms (type, minPrice, maxPrice, guests, sort, page, limit, includeInactive for admin, checkIn/checkOut excluding rooms that overlap non-cancelled mock bookings), GET /rooms/:id (404 for missing or inactive when not admin), GET /rooms/:id/availability (nights, subtotal, tax 10%, total), POST/PATCH/DELETE (admin only, validation, 409 ROOM_NUMBER_TAKEN), POST images/upload-url (fake url + key), POST images, DELETE image.
3. Validate requests with the Zod schemas from @hotel/shared and return 422 with details.
4. Tests: filters, sort, pagination meta, availability maths, admin-only rules, duplicate number.
5. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 1.8 (Mock rooms): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 1.8 | what was done`. Do not change anything else.
```

---

## STEP 1.9 - Mock bookings, payments, reports

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 1.9 ONLY: create the mock bookings module.

Do exactly this:
1. src/mocks/seed/bookings.ts: 14 bookings across the seed users and rooms in every status, with dates relative to today so the Upcoming, Past and Cancelled tabs and the staff views all have data. guestName filled in.
2. src/mocks/handlers/bookings.ts: POST /bookings (Idempotency-Key required -> 400; replay returns the same booking with 200; overlap -> 409 ROOM_NOT_AVAILABLE; pending with expiresAt = now + 15 min; totals as in the contract), GET /bookings/my (status one or comma-separated), GET /bookings/:id (403 for another guest), PATCH cancel (rules and INVALID_STATE), POST pay (creates a pending payment; after 2.5 s the mock marks it paid and the booking confirmed, like the real webhook), GET /bookings (staff and admin, filters, q), PATCH status (transitions, 409 INVALID_STATE), GET reports/sales and reports/occupancy computed from the mock data, POST dev simulate.
3. Expire pending bookings in the mock when expiresAt has passed (check on read).
4. Tests: create, replay, overlap, cancel, pay -> confirmed, transitions, report totals.
5. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 1.9 (Mock bookings, payments, reports): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 1.9 | what was done`. Do not change anything else.
```

---

## STEP 1.10 - Layout shells and role guard

Type: Frontend


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference.

STEP 1.10 ONLY: create the layouts, navigation and route guards.

Do exactly this:
1. src/components/layout/PublicHeader.tsx per DESIGN.md sections 7 and 8.1: logo, nav, Login button or avatar Dropdown (My bookings, Chat, Log out), mobile Drawer menu below 768.
2. src/components/layout/DashboardShell.tsx: Layout + Sider (dark Menu, collapse to 72, items by role), Header (page title, bell placeholder, avatar Dropdown), left Drawer below 992. Menu config in src/lib/navigation.ts as the single source of truth (route, roles, label, icon).
3. src/components/auth/RoleGuard.tsx (client): reads the auth slice; while loading shows a page Skeleton; logged out -> redirect to /login?next=; wrong role -> 403 Result 'You do not have access' with 'Back to home'. Use it in the (guest) and (dashboard) group layouts with the allowed roles from DECISIONS.md.
4. Route protection file (middleware.ts, or proxy.ts if the installed Next.js version uses that name; check its docs): coarse redirect to /login when neither the `access_token` nor the `mock_role` cookie exists on /book, /my-bookings, /chat and /dashboard. The backend still enforces roles.
5. src/app/not-found.tsx, src/app/error.tsx and src/app/loading.tsx using Result and Skeleton.
6. Fill the placeholder pages with PageHeader and a 'coming in the next steps' line only.
7. Tests: navigation config per role, RoleGuard redirects.
8. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 1.10 (Layout shells and role guard): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 1.10 | what was done`. Do not change anything else.
```

---

## STEP 1.11 - Login and register pages

Type: Frontend (uses the API contract)


**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference. Also read docs/API_CONTRACT.md.

STEP 1.11 ONLY: build /login and /register.

Do exactly this:
1. Build both pages per DESIGN.md section 8.3: split layout, left panel (photo /images/login.webp through RoomImage fallback, solid #14312C), right form column (max-width 400).
2. Forms with React Hook Form and the Zod resolver using loginSchema and registerSchema from @hotel/shared. Large inputs, labels above, helper text, a show/hide password icon button with aria-label.
3. Submit: button loading state; wrong credentials -> inline Alert 'Email or password is incorrect.'; 422 details -> field errors; 409 EMAIL_TAKEN -> error on the email field.
4. After login put the user in Redux and redirect by role (DECISIONS.md) or to the `next` param when the role may open it. Logout in the header calls the API, clears Redux and the query cache.
5. Component tests: validation messages, wrong password Alert, redirect per role.
6. Try guest, staff and admin seed accounts in mock mode and report.
7. Run lint, typecheck, tests and the build for what you touched (`pnpm --filter web lint`, `typecheck`, `test`, `build`). Fix every failure before reporting.

Stop after this step. Report what you created or changed (files), the commands you ran and their result, and anything you could not do and why.
```

**After the agent's report is good (and you checked it), send:**

```markdown
Add one line to PROGRESS.md for STEP 1.11 (Login and register pages): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 1.11 | what was done`. Do not change anything else.
```

---

## STEP 1.12 - Review Phase 1

Type: Frontend
  |  **REVIEW**

_Send this only after every earlier step of this phase is finished._

**Send this prompt:**

```markdown
Read AGENTS.md, DECISIONS.md, DESIGN.md and PERFORMANCE.md first. Open docs/design/ for the visual reference.

STEP 1.12 ONLY: review Phase 1 against the plan and fix differences. Do not add new features.

Do exactly this:
1. Produce a table: page (design-check, login, register, public header, dashboard shell, route guards, 403/404/error pages), requirement from DESIGN.md section 8 and the matching wireframe in docs/design/hotel-platform-design-system.pdf, status (OK or Different).
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
Add one line to PROGRESS.md for STEP 1.12 (Review Phase 1): what was done in one short sentence, with today's date (YYYY-MM-DD) in the format `YYYY-MM-DD | STEP 1.12 | what was done`. Do not change anything else.
```

---
