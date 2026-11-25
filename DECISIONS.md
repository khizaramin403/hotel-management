# DECISIONS.md - fixed decisions

Do not change these without asking the owner. If you must log a new decision, add a row at the bottom when told to.

## Product
| Decision | Value |
|---|---|
| Hotel | One hotel (not multi-tenant). No hotel_id columns. |
| Roles | guest, staff, admin (RBAC) + ownership checks on guest data |
| Chatbot | Not included |
| Language | English only, no i18n library |
| Currency | PKR, whole rupees as integers. Tax 10% (rounded). total = subtotal + tax |
| Dates | Check-in/out are calendar dates (YYYY-MM-DD, Postgres DATE). Timestamps are UTC ISO strings |
| Booking statuses | pending, confirmed, checked_in, checked_out, cancelled |
| Payment statuses | pending, paid, failed, refunded |
| Pending expiry | A pending booking not paid within 15 minutes becomes cancelled (delayed BullMQ job, phase 7) |
| Room types | Single, Double, Deluxe, Suite, Family |

## Routes and who may open them
| Route | Roles |
|---|---|
| `/`, `/rooms/[id]`, `/login`, `/register` | public |
| `/book/[roomId]`, `/my-bookings`, `/chat` | guest |
| `/dashboard` (overview), `/dashboard/rooms`, `/dashboard/staff`, `/dashboard/reports` | admin |
| `/dashboard/bookings`, `/dashboard/chat` | staff, admin |
After login: guest -> `/`, staff -> `/dashboard/bookings`, admin -> `/dashboard`.
The frontend guards routes for UX only. The backend always enforces roles.

## Frontend stack
| Item | Choice | Why |
|---|---|---|
| Framework | Next.js (latest stable, App Router, TypeScript, `src/` dir) | SEO for public pages, routing |
| Styling | Tailwind CSS **v3** (`tailwind.config.js`), preflight disabled | Tokens in DESIGN.md are written for v3. Do not upgrade to v4 |
| Components | Ant Design **v5** + `@ant-design/nextjs-registry` + `@ant-design/icons` | If React 19 needs it, add `@ant-design/v5-patch-for-react-19` and note it here |
| Client state | Redux Toolkit (slices: auth, ui, bookingDraft, chat, call) | Owner's choice (not Zustand) |
| Server state | TanStack Query v5 | Cache, loading, error, pagination |
| Long lists | TanStack Virtual, only for the chat thread (and any list that can exceed 200 rows) | |
| Forms | React Hook Form + Zod resolver, schemas from `@hotel/shared` | |
| HTTP | Axios with interceptors | Token refresh in one place |
| Charts | Recharts, always dynamically imported | Light, simple |
| Realtime | socket.io-client; WebRTC via browser API | |
| Fonts | Inter (UI) and Fraunces (headings) through `next/font/google` | |
| Unit tests | Vitest + React Testing Library | Faster than Jest with Next |
| Mock data | `axios-mock-adapter`, in-memory, per module | Frontend is built first against the API contract |

### Mock mode (frontend first)
- `NEXT_PUBLIC_USE_MOCKS=true` turns mocks on. `NEXT_PUBLIC_MOCK_MODULES=auth,rooms,bookings,chat` chooses which modules are mocked. Modules not listed go to the real API.
- Mock responses must match docs/API_CONTRACT.md exactly (same envelope, same field names).
- Mock auth sets a readable cookie `mock_role` so route guarding works. Real auth uses httpOnly cookies set by the backend.
- Images: URLs are built from `NEXT_PUBLIC_IMAGE_BASE_URL` (default `/images`). Missing image files show a neutral placeholder block (never a broken image). The owner adds real photos later in `apps/web/public/images/`.

## Backend stack
| Item | Choice |
|---|---|
| Runtime | Node 20+, TypeScript, `tsx` for dev, `tsup` for builds |
| Framework | Express 5 (async handlers, named wildcards in route patterns) |
| Database | PostgreSQL 16, `pg` Pool, plain SQL models. Migrations with `node-pg-migrate`. One schema per service |
| Cache, queues, limits | Redis 7 via `ioredis`; BullMQ for jobs; `express-rate-limit` with a Redis store |
| Auth | JWT access token 15 min and refresh token 7 days in httpOnly cookies (`access_token`, `refresh_token`). Passwords with `argon2` (fallback `bcryptjs` if install fails, then log it here) |
| Validation | Zod (shared with the frontend) |
| Security | helmet, CORS limited to `ALLOWED_ORIGINS`, Origin check on state-changing requests, SameSite=Lax cookies |
| Logging, errors | Pino (JSON, request id), Sentry |
| Realtime | Socket.IO + `@socket.io/redis-adapter`, WebRTC audio with coturn (STUN/TURN) |
| Images | S3 (MinIO in dev) with presigned upload URLs, `sharp` worker makes 400/800/1600 px WebP |
| Email | `nodemailer` (Mailpit in dev) |
| Push | `web-push` (VAPID) |
| Docs | OpenAPI/Swagger at `/docs` per service |
| Tests | Jest + Supertest |
| API testing | Postman collection in `postman/`, Newman in CI |

## Architecture
| Decision | Value |
|---|---|
| Services | auth 3001, room 3002, booking 3003, chat 3004, notification 3005 |
| Gateway | Dev: `infra/dev-gateway` (Node, port 8080). Production: Nginx. Same route table in both |
| Web to API | The browser calls `/api/v1/...` on the Next.js origin. Next.js `rewrites` forward to the gateway (dev). Sockets connect straight to the gateway origin with credentials |
| Internal calls | Service to service over HTTP with header `x-internal-key`, routes under `/internal/*`, never exposed by the gateway, with timeout (2 s) and 1 retry |
| Shared code | `@hotel/shared` (schemas, types) and `@hotel/service-kit` (backend helpers) |
| Double booking | Postgres EXCLUDE constraint (btree_gist) + transaction + idempotency key |
| Payments | Demo provider. Webhook `POST /api/v1/bookings/webhooks/payment` with HMAC-SHA256 signature. Dev-only simulate endpoint exists |
| Mobile | Responsive web only |

## Deviations from the documentation PDF (intentional)
- TypeScript everywhere (the PDF snippets are plain JavaScript).
- Two extra packages: `packages/shared` and `packages/service-kit`.
- Vitest for the frontend (Jest stays for the backend).
- Money includes a 10% tax; docs/API_CONTRACT.md is the source of truth for amounts and shapes.

## Decision log (agent adds rows only when told)
| Date | Decision | Reason |
|---|---|---|
