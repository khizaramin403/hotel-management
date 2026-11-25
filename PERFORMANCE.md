# PERFORMANCE.md - performance rules

Check these on every step and in every review step. Report each rule as OK or Different.

## Frontend
1. **Narrow Redux selectors only.** `useAppSelector((s) => s.bookingDraft.guests)`, never the whole slice or store. Use `createSelector` for derived data.
2. **No Context API for shared data.** Context is allowed only for the Ant Design theme config and the socket instance. Everything else shared is Redux (client state) or TanStack Query (server data).
3. **Never copy API data into Redux.** Server data lives in TanStack Query.
4. **Server-style pagination** on every list: 12 rooms per page, 10 table rows per page (page sizes 10/20/50). Page and filters live in the URL. Never fetch "all" and slice on the client.
5. **`React.memo`** on `RoomCard`, `BookingRow` and `ChatMessage`. No `memo`/`useMemo`/`useCallback` spraying: add them only where props are stable and the component is rendered in a list or is heavy.
6. **Stable keys:** use the entity `id`, never the array index.
7. **Live updates** (chat, booking status) use `queryClient.setQueryData`, not a full refetch of the list.
8. **Dynamic import** (`next/dynamic`) for: Recharts charts, the image lightbox, the room form modal, the call popup. These must not be in the first page bundle.
9. **TanStack Virtual** only for the chat thread (can exceed 200 rows). Do not virtualize lists of 12-20 items.
10. **Search input:** local state + debounce (300 ms) + URL param. Not Redux, not Context.
11. **Server Components** by default. Add `"use client"` only to the interactive leaf.
12. **Images:** `next/image` with fixed width/height, `sizes`, lazy loading (hero uses `priority`), blur placeholder. Cards use the 400 px size, detail 800 px, hero and lightbox 1600 px.
13. **Fonts:** `next/font` with `display: swap`. No other font requests.
14. **No layout shift:** reserve space for images, skeletons match the final layout.
15. **Bundle:** import Ant Design components by name (no deep style imports), icons by name. Check the build output; any route over 250 KB first-load JS must be explained.

## Backend
1. Every list endpoint is paginated (`page`, `limit`, max limit 50).
2. Indexes exist for every WHERE/JOIN/ORDER used by a list or lookup (see the migrations). Check with `EXPLAIN` on the rooms list and bookings list queries.
3. `pg.Pool` is created once per service (max 10 connections). Never create a client per request.
4. Redis caches: room list (60 s) and room detail (120 s), invalidated on room create/update/delete. Cache keys include all query params.
5. Slow work goes to BullMQ (email, push, image resize, booking expiry). Never inside the request.
6. Service-to-service calls have a 2 s timeout and 1 retry. No N+1 calls: batch where needed.
7. Select only the needed columns. No `SELECT *` on list queries.
8. gzip compression on JSON responses (at the gateway in production).
9. Graceful shutdown: stop accepting requests, finish in-flight work, close pool/redis.

## Targets (measured in the final review)
- Rooms list page: Lighthouse performance >= 90 on desktop, LCP < 2.5 s, CLS < 0.1.
- `GET /rooms` cached: p95 < 100 ms locally. `POST /bookings`: p95 < 300 ms locally.
- No console errors or React key warnings.
