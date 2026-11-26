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
2026-11-25 | STEP 1.3 | Installed Ant Design v5 with React 19 patch, AntdProvider theme aligned to DESIGN.md, and Ant Design /design-check showcase
2026-11-25 | STEP 1.4 | Created shared UI primitives, image URL and en-GB format helpers, /design-check showcase, and Vitest unit tests
2026-11-25 | STEP 1.5 | Configured Redux Toolkit store and 5 slices with narrow selectors, TanStack Query AppProviders, and Vitest RTL jsdom tests
2026-11-25 | STEP 1.6 | Built typed Axios API client with refresh queue, ApiClientError normalizer, REST endpoints, queryKeys, and mocked adapter tests
2026-11-25 | STEP 1.7 | Built dynamic axios-mock-adapter infrastructure, seeded in-memory DB, auth mock handlers with mock_role cookie, startup auth bootstrap, and tests
2026-11-25 | STEP 1.8 | Seeded 12 mock rooms with image URLs and built Zod-validated room list, detail, availability, admin CRUD, and image mock handlers with tests
2026-11-25 | STEP 1.9 | Seeded 14 relative-date bookings and built booking, 2.5 s payment webhook, expiry-on-read, status transition, and report mock handlers with tests
2026-11-25 | STEP 1.10 | Created PublicHeader, DashboardShell, single-source navigation config, client RoleGuard, proxy route protection, error/loading boundaries, placeholder PageHeaders, and tests
2026-11-25 | STEP 1.11 | Built /login and /register split layouts with React Hook Form Zod validation, role-aware next redirects, header logout cache clear, and mock auth tests
2026-11-25 | STEP 1.12 | Reviewed Phase 1 against DESIGN.md, DECISIONS.md, and PERFORMANCE.md, fixed mobile 44px touch targets, overflow-x clip, Suspense Skeletons, ErrorState reuse, and a11y gaps, and verified all lint, typecheck, test, and build checks
2026-11-26 | STEP 2.1 | Built RoomCard, RoomCardSkeleton, responsive RoomGrid, and useRoomsQuery hook with temporary home page loading, empty, and error states plus unit tests
2026-11-26 | STEP 2.2 | Built HomeHero and overlapping HeroSearchCard with DatePicker.generatePicker RangePicker, 1-6 guests stepper, room type Select, URL query sync, and unit tests
2026-11-26 | STEP 2.3 | Connected room type and price chips, sort Select, and centered Pagination to URL params and useRoomsQuery with empty clear-filters and error retry states plus tests
2026-11-26 | STEP 2.4 | Built room detail left column on /rooms/[id] with useRoomQuery, 16:10 gallery and dynamic lightbox Modal, facility icon tags, 6-line Read more toggle, 404/error states, and tests
2026-11-26 | STEP 2.5 | Built sticky BookingCard on /rooms/[id] with 300 ms debounced useRoomAvailabilityQuery, role-aware Book now actions, mobile 72px bottom bar and Drawer, and tests
2026-11-26 | STEP 2.6 | Built /book/[roomId] Steps 1-2 with fresh availability re-check, Change links, React Hook Form + @hotel/shared guestDetailsSchema validation, sticky 4/12 summary card, sessionStorage bookingDraft persistence, and tests
2026-11-26 | STEP 2.7 | Built /book/[roomId] Step 3 Payment with idempotent POST /bookings + /pay, 2 s status polling and 60 s waiting Alert, NEXT_PUBLIC_SHOW_DEV_PAYMENT simulate buttons, BK-<id> Result with draft reset, 409/422/toast handling, and tests
2026-11-26 | STEP 2.8 | Built /my-bookings with status Tabs in URL, sortable 10-per-page Table and <768px BookingRow cards, 420px detail Drawer, Popconfirm cancel with setQueryData, shared Pay now confirmation hook, and tests
2026-11-26 | STEP 2.9 | Reviewed Phase 2 pages against DESIGN.md, PERFORMANCE.md, and DECISIONS.md, fixed 768px 44px touch targets, centralized mask/focus-ring/pagination tokens, switched booking confirmation to setQueryData, and verified lint, typecheck, tests, and build
2026-11-26 | STEP 3.1 | Built admin /dashboard overview with 4 responsive stat cards, dynamic Recharts sales bar chart, 5-row compact recent bookings table, isolated loading/error states, and unit tests
2026-11-26 | STEP 3.2 | Built /dashboard/bookings for staff and admin with URL-synced status Chips, RangePicker, 300 ms debounced search, 10/20/50 paginated Table and memoized BookingRow mobile cards, 420 px detail Drawer, status actions with Popconfirm, setQueryData cache updates, 409 handling, and tests
2026-11-26 | STEP 3.3 | Built admin /dashboard/rooms table with URL-synced number search, Type and Status filters (with shared schema and mock q/isActive support), 56x40 thumbnails, placeholder Add/Edit modal, Delete Popconfirm with setQueryData cache update, skeleton/empty/error states, and tests
2026-11-26 | STEP 3.4 | Built dynamic 520px RoomFormModal with React Hook Form and createRoomSchema/updateRoomSchema validation, PKR 1,000/1-8 capacity bounds, tags facilities, edit detail pre-fill and Active switch, unsaved Discard Popconfirm, 409 duplicate number error mapping, setQueryData cache upsert, and tests
