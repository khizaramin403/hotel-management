# API_CONTRACT.md - the API, the shapes, the rules

Single source of truth for the frontend mocks, the backend and `@hotel/shared`. If code and this file disagree, fix the code (or ask the owner to change this file).

## 1. Conventions
- Base path `/api/v1`. Through the gateway: `http://localhost:8080/api/v1` (dev), `https://<domain>/api/v1` (prod).
- JSON only. `Content-Type: application/json`.
- Auth: cookies `access_token` (15 min) and `refresh_token` (7 days), httpOnly, SameSite=Lax, `Secure` in production. Refresh cookie path `/api/v1/auth`.
- Money: integer PKR. IDs: integers. Dates `YYYY-MM-DD`. Timestamps UTC ISO 8601.
- Pagination: `?page=1&limit=12` (limit max 50). Responses carry `meta`. Chat history uses `?cursor=<messageId>&limit=30`.
- Every response has the envelope below. 204 responses have no body.
- `x-request-id` is added by the gateway (or created by the service) and returned in the response header.
- State-changing requests with an `Origin` header must match `ALLOWED_ORIGINS`, else 403 `FORBIDDEN`.

### Envelope
```json
{ "success": true, "data": {}, "meta": { "page": 1, "limit": 12, "total": 48, "totalPages": 4 } }
```
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Invalid input",
  "details": [ { "field": "email", "message": "Invalid email" } ] } }
```
`meta` only on paginated lists. `details` only on validation errors.

### Error codes
| HTTP | code | When |
|---|---|---|
| 400 | BAD_REQUEST | malformed JSON |
| 400 | IDEMPOTENCY_KEY_REQUIRED | POST /bookings without `Idempotency-Key` |
| 401 | UNAUTHENTICATED | no/invalid access token |
| 401 | TOKEN_EXPIRED | access token expired (client should call refresh) |
| 401 | INVALID_SIGNATURE | webhook signature wrong |
| 403 | FORBIDDEN | wrong role, not the owner, bad Origin |
| 404 | NOT_FOUND | unknown or inactive resource |
| 409 | EMAIL_TAKEN | register with an existing email |
| 409 | ROOM_NUMBER_TAKEN | room number already exists |
| 409 | ROOM_NOT_AVAILABLE | overlapping dates |
| 409 | INVALID_STATE | transition not allowed (e.g. cancel after check-in) |
| 422 | VALIDATION_ERROR | body/query/params failed Zod validation |
| 429 | RATE_LIMITED | too many requests (header `Retry-After`) |
| 500 | INTERNAL_ERROR | unexpected |

## 2. Entities
```ts
type Role = "guest" | "staff" | "admin";
type RoomType = "Single" | "Double" | "Deluxe" | "Suite" | "Family";
type BookingStatus = "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled";
type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

User    = { id, name, email, role, createdAt? }
Image   = { id, key, isCover, sortOrder, urls: { sm, md, lg } }          // 400 / 800 / 1600 px WebP
Room    = { id, number, type, pricePerNight, capacity, facilities: string[], description,
            isActive, coverImage: Image | null }
RoomDetail = Room & { images: Image[] }
Payment = { id, bookingId, amount, status, providerRef: string | null }
Booking = { id, userId, guestName, roomId, roomNumber, roomType, checkIn, checkOut, guests, nights,
            subtotal, taxAmount, totalPrice, status, expiresAt: string | null, createdAt,
            payment: { id, status } | null }
Conversation = { id, guestId, guestName, staffId: number | null, status: "open" | "closed",
                 lastMessage: { text, createdAt } | null, unreadCount }
Message = { id, conversationId, senderId, senderRole: Role, text, createdAt }
```
Tax = round(subtotal x 0.10). totalPrice = subtotal + taxAmount. subtotal = nights x pricePerNight.
Booking rules: checkIn >= today, checkOut > checkIn, nights <= 30, 1 <= guests <= room.capacity, room active.

## 3. Auth Service (3001)
| Method | Path | Access | Body / query | Success |
|---|---|---|---|---|
| POST | /auth/register | public | `{ name (2-60), email, password (>=8, letter+number) }` | 201 `{ user }` (role guest). 409 EMAIL_TAKEN |
| POST | /auth/login | public | `{ email, password }` | 200 `{ user }` + cookies. 401 UNAUTHENTICATED ("Email or password is incorrect") |
| POST | /auth/refresh | refresh cookie | - | 200 `{ user }` + new cookies (refresh rotates) |
| POST | /auth/logout | logged in | - | 204, cookies cleared, refresh token revoked |
| GET | /auth/me | logged in | - | 200 `{ user }` |
| GET | /auth/staff | admin | `page, limit` | 200 `User[]` role staff + meta |
| POST | /auth/staff | admin | `{ name, email, password }` | 201 `{ user }` role staff |
| DELETE | /auth/staff/:id | admin | - | 204 |
Login rate limit: 10 attempts per 15 minutes per IP+email, then 429.

## 4. Room Service (3002)
| Method | Path | Access | Body / query | Success |
|---|---|---|---|---|
| GET | /rooms | public | `type, minPrice, maxPrice, guests, checkIn, checkOut, sort (price_asc \| price_desc \| number), q? (room number), includeInactive?, isActive? (admin with includeInactive=true), page, limit` (default limit 12) | 200 `Room[]` + meta. With dates, unavailable rooms are excluded |
| GET | /rooms/:id | public | - | 200 `RoomDetail` |
| GET | /rooms/:id/availability | public | `checkIn, checkOut` | 200 `{ available: boolean, nights, subtotal, taxAmount, totalPrice }` |
| POST | /rooms | admin | `{ number, type, pricePerNight, capacity, facilities[], description }` | 201 `RoomDetail`. 409 ROOM_NUMBER_TAKEN |
| PATCH | /rooms/:id | admin | any subset of the create body (+ `isActive`) | 200 `RoomDetail` |
| DELETE | /rooms/:id | admin | - | 204 (sets isActive=false) |
| POST | /rooms/:id/images/upload-url | admin | `{ fileType: "image/jpeg" \| "image/png" \| "image/webp" }` | 200 `{ uploadUrl, key }` (valid 5 min, max 5 MB) |
| POST | /rooms/:id/images | admin | `{ key, isCover }` | 201 `Image` |
| PATCH | /rooms/:id/images/:imageId | admin | `{ isCover: true }` | 200 `Image` |
| DELETE | /rooms/:id/images/:imageId | admin | - | 204 |
Inactive rooms are hidden from public endpoints (404) and visible to admin with `?includeInactive=true` on the list (optionally filtered by `?isActive=true|false` and `?q=<number>`).
Internal (header `x-internal-key`): `GET /internal/rooms/:id` -> `Room`; `GET /internal/rooms/count` -> `{ activeRooms: number }`.

## 5. Booking Service (3003)
| Method | Path | Access | Body / query | Success |
|---|---|---|---|---|
| POST | /bookings | guest | header `Idempotency-Key` (UUID). `{ roomId, checkIn, checkOut, guests }` | 201 `Booking` (status pending, expiresAt now+15 min). Same key + same user again -> 200 same booking. 409 ROOM_NOT_AVAILABLE |
| GET | /bookings/my | guest | `status? (one value or a comma-separated list), page, limit` | 200 `Booking[]` + meta |
| GET | /bookings/:id | owner, staff, admin | - | 200 `Booking`. Another guest -> 403 |
| PATCH | /bookings/:id/cancel | owner, staff, admin | - | 200 `Booking` (cancelled). Paid -> payment becomes refunded. 409 INVALID_STATE after check-in |
| POST | /bookings/:id/pay | owner | - | 200 `{ paymentId, amount, status: "pending" }`. 409 if not pending |
| GET | /bookings | staff, admin | `status? (one value or a comma-separated list), from?, to?, q? (reference or guest name), page, limit` | 200 `Booking[]` + meta |
| PATCH | /bookings/:id/status | staff, admin | `{ status: "checked_in" \| "checked_out" }` | 200 `Booking`. Allowed: confirmed->checked_in, checked_in->checked_out |
| GET | /bookings/reports/sales | admin | `from, to` | 200 `{ from, to, totalRevenue, bookingCount, daily: [{ date, revenue, bookings }] }` |
| GET | /bookings/reports/occupancy | admin | `from, to` | 200 `{ from, to, occupancyRate, roomNights, availableRoomNights, daily: [{ date, occupiedRooms, rate }] }` |
| POST | /bookings/webhooks/payment | provider | header `x-signature` = HMAC-SHA256 hex of the raw body with `PAYMENT_WEBHOOK_SECRET`. `{ paymentId, bookingId, status: "paid" \| "failed", providerRef }` | 200 `{ received: true }`. Bad signature 401 INVALID_SIGNATURE. Repeated event = no-op 200 |
| POST | /bookings/dev/payments/:paymentId/simulate | dev only (404 in production) | `{ status: "paid" \| "failed" }` | 200. Signs and calls the same webhook handler |
Reference shown to users: `BK-` + id (e.g. BK-1041). Revenue counts confirmed, checked_in and checked_out bookings by check-in date.
Internal: `POST /internal/availability` `{ checkIn, checkOut }` -> `{ unavailableRoomIds: number[] }` (header `x-internal-key`).
Transitions: pending->confirmed (payment paid), pending->cancelled (expiry or cancel), confirmed->checked_in->checked_out, confirmed->cancelled.

## 6. Chat Service (3004)
REST:
| Method | Path | Access | Success |
|---|---|---|---|
| POST | /chat/conversations | guest | 201 `Conversation` (returns the existing open one if there is one) |
| GET | /chat/conversations | guest (own), staff/admin (all open) | 200 `Conversation[]` + meta |
| GET | /chat/conversations/:id/messages | participants, staff, admin | 200 `Message[]` (newest first) + `meta: { nextCursor }` |
| GET | /chat/ice-servers | logged in | 200 `{ iceServers: [{ urls, username?, credential? }] }` (STUN + TURN with time-limited credentials) |
Socket.IO (connect to the gateway origin, path `/socket.io`, auth by the same cookie):
| Direction | Event | Payload |
|---|---|---|
| client -> server | `message:send` | `{ conversationId, text (1-2000) }` (ack returns `Message`) |
| client -> server | `typing:start` / `typing:stop` | `{ conversationId }` |
| client -> server | `conversation:read` | `{ conversationId }` |
| client -> server | `call:offer` | `{ conversationId, sdp }` |
| client -> server | `call:answer` | `{ conversationId, sdp }` |
| client -> server | `call:ice` | `{ conversationId, candidate }` |
| client -> server | `call:reject` / `call:end` | `{ conversationId }` |
| server -> client | `message:new` | `Message` |
| server -> client | `typing` | `{ conversationId, userId, isTyping }` |
| server -> client | `conversation:updated` | `Conversation` |
| server -> client | `call:incoming` | `{ conversationId, fromUserId, sdp }` |
| server -> client | `call:answered` | `{ conversationId, sdp }` |
| server -> client | `call:ice` | `{ conversationId, candidate }` |
| server -> client | `call:rejected` / `call:ended` | `{ conversationId }` |

## 7. Notification Service (3005)
| Method | Path | Access | Body | Success |
|---|---|---|---|---|
| GET | /notifications/push/public-key | logged in | - | 200 `{ publicKey }` |
| POST | /notifications/push/subscribe | logged in | `{ endpoint, keys: { p256dh, auth } }` | 201 |
| DELETE | /notifications/push/subscribe | logged in | `{ endpoint }` | 204 |
Jobs (BullMQ, no REST): `booking.confirmed` (email + push), `booking.cancelled` (email), `chat.message` (push to the other side if offline), `booking.expire` (delayed 15 min), `image.resize`.
The notification bell in the UI is client-side only (Redux), fed by events. There is no REST list.

## 8. Health
`GET /health` on every service and on the gateway -> 200 `{ status: "ok", service, uptime }` (no envelope required, no auth).

## 9. Seed data (development)
| Email | Password | Role |
|---|---|---|
| guest@example.com | Passw0rd!123 | guest |
| staff@example.com | Passw0rd!123 | staff |
| admin@example.com | Passw0rd!123 | admin |
12 rooms: numbers 101-104 Single/Double, 201-204 Deluxe, 301-302 Suite, 210-211 Family; prices between PKR 6,000 and 30,000. A few bookings in each status.
