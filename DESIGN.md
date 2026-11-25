# DESIGN.md - UI rules

Full visual reference (wireframes, button states, colors): `docs/design/hotel-platform-design-system.pdf`.
This file is the text version. If the PDF and this file disagree, this file wins.

Look: minimal, modern, warm, calm. It must NOT look AI-generated.
Forbidden: gradients, glow shadows, glassmorphism, emoji in the UI, decorative animation, centered-everything layouts, slogans, more than two fonts.

## 1. Principles
- Flat surfaces, thin borders, white space. Photos carry the visual weight.
- One system: 4px spacing scale, one type scale, radius 8 and 12, one focus style.
- Every interactive element has default, hover, pressed, focus, disabled (and loading where it can wait).
- Accessible: text contrast >= 4.5:1, visible keyboard focus, touch targets >= 44px on mobile.
- Short direct copy: "Book now", "Check availability".

## 2. Color tokens
| Token | Hex | Use |
|---|---|---|
| green-50 | #F0F5F4 | hover bg of secondary/text buttons |
| green-100 | #E6EEEC | selected chip, selected row, pressed text button |
| green-200 | #C5D8D3 | card hover border, progress track |
| green-300 | #8FB0A8 | input hover border |
| green-500 | #2A6358 | primary hover |
| green-600 | #1F4D45 | PRIMARY: buttons, links, focus outline, selected borders |
| green-700 | #163A34 | primary pressed |
| green-800 | #14312C | sidebar bg, dark panels |
| green-900 | #0D211E | deepest dark |
| brass-100 | #F6EBD6 | notice backgrounds |
| brass-300 | #E3CFA4 | subtle decorative lines |
| brass-500 | #B8893B | decoration only (sidebar selected indicator, dividers). Never text, never a button fill |
| brass-700 | #8A6428 | brass-toned text on light bg |
| canvas | #F7F6F2 | page background, table header, hover row |
| white | #FFFFFF | cards, inputs, header, modals |
| neutral-100 | #EFEDE6 | skeleton base, neutral tag bg, system chat pill |
| line | #E7E5DF | borders, dividers, disabled bg |
| line-strong | #D6D3CB | input and secondary button borders |
| neutral-400 | #9CA3AF | disabled text only |
| muted | #5B6472 | secondary text |
| ink | #1F2933 | main text |
| placeholder | #6B7280 | input placeholder |
Semantic: success #2E7D4F (bg #E7F4EC, text #1F6B42); warning #B7791F (bg #FDF3DC, text #8A5A00); error #B42318 (bg #FDECEA, hover #912018, pressed #7A1A12); info #2B5C8A (bg #E8F0FA).
Rules: one primary button per view. Status is never color only (tags carry text). Charts use green-600 for the main series, neutral for comparison. No dark mode.

## 3. Typography
Fonts: **Fraunces** (500/600) for headings, hero, prices. **Inter** (400/500/600) for everything else. Fallbacks Georgia / system-ui. Load with `next/font/google`, `display: swap`.
| Role | Font | Desktop size/line | Mobile | Use |
|---|---|---|---|---|
| Display | Fraunces 600, -0.02em | 48/56 | 36/44 | hero headline only |
| H1 | Fraunces 600, -0.01em | 36/44 | 28/36 | page titles |
| H2 | Fraunces 600 | 28/36 | 24/32 | section titles |
| H3 | Fraunces 500 | 22/30 | 20/28 | card section titles, modal titles, dashboard page title |
| Price | Fraunces 600 | 24/32 | 22/30 | prices, totals |
| H4 | Inter 600 | 18/26 | 18/26 | room card title, panel titles |
| Body large | Inter 400 | 16/26 | 16/26 | public pages, descriptions |
| Body | Inter 400 | 14/22 | 14/22 | dashboard, forms, tables |
| Label | Inter 500 | 14/20 | | form labels, menu, tabs |
| Button | Inter 500 | 14/20 (small 13/20, large 16/24) | | buttons |
| Table header | Inter 600 | 13/20, 0.02em | | table headings |
| Small | Inter 400 | 13/20 | | helper text, meta |
| Caption | Inter 400/500 | 12/18 | | timestamps, tags |
Rules: sentence case, left aligned (center only in Empty/Result). Descriptions max 65ch. Numbers in tables: tabular-nums, right aligned. Price format `PKR 15,000`, "per night" in Small muted.

## 4. Spacing, grid, shape, motion, icons
- Spacing scale (px): 4, 8, 12, 16, 20, 24, 32, 48, 64, 96 (Tailwind default 4px base: p-1=4 ... p-6=24).
- Container: max-width 1200, centered, side padding 24 (16 below 992). 12 columns, gutter 24 (16 below 992).
- Dashboard: sidebar 240 (72 collapsed) + fluid content, content max-width 1440, padding 24. Header height 64.
- Section spacing: 48 (32 mobile); related blocks 24; fields 16.
- Breakpoints (match Ant Design): sm 576, md 768, lg 992, xl 1200, 2xl 1600. Mobile first.
- Rooms grid: 1 col <576, 2 cols 576-991, 3 cols 992-1599, 4 cols >=1600.
- Radius: 4 tags, 8 buttons/inputs, 12 cards/modals/drawers, full chips/avatars.
- Border: 1px #E7E5DF (strong #D6D3CB for inputs and secondary buttons). Cards use border only (no shadow).
- Elevation-1: 0 4px 12px rgba(20,49,44,0.08) (dropdowns, card hover). Elevation-2: 0 12px 32px rgba(20,49,44,0.16) (modal, drawer). Overlay rgba(20,49,44,0.45).
- Focus (all interactive): `outline: 2px solid #1F4D45; outline-offset: 2px`. Inputs: border #1F4D45 + `0 0 0 3px rgba(31,77,69,0.15)`.
- Motion: 120ms color/hover, 200ms popovers/tabs, 240ms modal/drawer, easing cubic-bezier(0.2,0,0,1). No bounce, no scale-on-hover. Respect prefers-reduced-motion.
- Icons: Ant Design Icons Outlined only. 16 inline, 20 buttons/menu, 24 header, 48 Empty/Result. Icon-only buttons need aria-label + Tooltip.

## 5. Buttons
Sizes: small 32h/12px pad/13px; middle 40h/16px pad/14px (default); large 48h/24px pad/16px. Radius 8. Min width 88 for labeled buttons. Labels sentence case, max 3 words. On touch devices min hit area 44x44.
| State | Primary | Secondary (default) | Text | Danger | Danger outline |
|---|---|---|---|---|---|
| Default | bg #1F4D45, text #FFF | bg #FFF, border #D6D3CB, text #1F2933 | no bg, text #1F4D45 | bg #B42318, text #FFF | bg #FFF, border+text #B42318 |
| Hover | bg #2A6358 | bg #F0F5F4, border+text #1F4D45 | bg #F0F5F4 | bg #912018 | bg #FDECEA |
| Pressed | bg #163A34 | bg #E6EEEC, border+text #1F4D45 | bg #E6EEEC | bg #7A1A12 | bg #FAD4D0, border #912018 |
| Focus | 2px #1F4D45 outline, 2px offset | same | same | same | same |
| Disabled | bg #E7E5DF, text #9CA3AF | bg #F7F6F2, border #E7E5DF, text #9CA3AF | text #9CA3AF | bg #E7E5DF, text #9CA3AF | bg #F7F6F2, border #E7E5DF, text #9CA3AF |
| Loading | 16px spinner left of label, width unchanged, clicks blocked | spinner green | spinner green | spinner white | spinner red |
Transition: background-color, border-color, color 120ms. Cursor pointer, not-allowed when disabled. No movement.
Button pairs: secondary left, primary right, 12px gap. Mobile: stacked, primary on top, full width. Form submit shows loading and blocks double submit.
Icon button: square at the same height, secondary or text style, with Tooltip.
**Chip (toggle)**: pill, 36h, 14px pad, Inter 500 14, gap 8. Default bg #FFF border #D6D3CB text #1F2933. Hover bg #F0F5F4 border+text #1F4D45. Selected bg #E6EEEC border #1F4D45 text #1F4D45 + 16px check icon. Selected hover bg #DCE8E5. Disabled bg #F7F6F2 border #E7E5DF text #9CA3AF. Focus outline.
Other selected states: tabs (green text + 2px green underline), pagination (green fill, white text), segmented (white pill with border on #EFEDE6 track), table rows (#E6EEEC + 3px green left bar).

## 6. Forms
Height 40 (small 32, large 48 for login and hero search). Padding 0 12. Radius 8. Border 1px #D6D3CB, bg #FFF. Text Inter 14 (16 on mobile inputs). Placeholder #6B7280, never a label substitute.
Label above, Inter 500 14/20, 6px gap. Helper/error below, Inter 13/20, 6px gap; helper #5B6472, error #B42318 with icon.
States: hover border #8FB0A8; focus border #1F4D45 + ring; error border #B42318 + `0 0 0 3px rgba(180,35,24,0.15)`; disabled bg #F7F6F2 border #E7E5DF text #9CA3AF.
Field gap 16, section gap 24. Optional fields say "(optional)" in the label, no red asterisks. Validate on blur and submit, scroll to first error.
Select option height 40, hover #F7F6F2, selected #E6EEEC + check. Date range: selected start/end green circle, range #E6EEEC, today 1px green ring, unavailable dates #9CA3AF not clickable. Textarea min 96. Checkbox/radio/switch color #1F4D45. Image upload: dashed 1px #D6D3CB, 120h, radius 12, hover border green + bg #F0F5F4, 4px green progress bar.

## 7. Components
- **Room card**: bg #FFF, 1px #E7E5DF, radius 12. Image 4:3 edge to edge with blur placeholder, content padding 16. Title Inter 600 18 (1 line, truncate). Meta Inter 13 muted ("2 guests - 28 m2"). Price Fraunces 600 22 + "/ night" Inter 13 muted. Hover: border #C5D8D3 + elevation-1 (120ms), no movement. Whole card is a focusable link.
- **Stat card** (Statistic in Card): padding 24, radius 12, label 13 muted, value Fraunces 600 32/40.
- **Tags** (24h, padding 0 8, radius 4, Inter 500 12, 6px status dot): Pending bg #FDF3DC text #8A5A00 dot #B7791F; Confirmed bg #E7F4EC text #1F6B42 dot #2E7D4F; Checked in bg #E8F0FA text #2B5C8A; Checked out bg #EFEDE6 text #4B5563 dot #9CA3AF; Cancelled bg #FDECEA text #B42318. Payment: Paid green, Failed red, Refunded neutral.
- **Table**: header bg #F7F6F2, Inter 600 13/20, height 48, bottom border #E7E5DF. Row 56 (compact 44), cell padding 12 16, bottom border, no zebra. Hover #F7F6F2. Selected #E6EEEC + 3px #1F4D45 left bar. Numbers right aligned tabular. Pagination bottom right (item 40, selected green fill; sizes 10/20/50). Loading = skeleton rows. Empty = Empty component. Below 768px: stacked cards (or horizontal scroll inside its own container).
- **Sidebar** (Layout.Sider + dark Menu): 240 (72 collapsed), bg #14312C, logo area 64. Item height 44, margin 4px 12px, radius 8, icon 20, gap 12, text Inter 500 14. Default text #B7C7C2; hover bg rgba(255,255,255,0.06) text #FFF; selected bg #1F4D45 text #FFF + 3px brass #B8893B indicator on the left inside the item; focus 2px white outline. Section label Inter 600 12, 0.06em, #8FA39D. Collapsed shows Tooltip labels. Below 992 it becomes a left Drawer (280).
- **Header** (dashboard): 64h, white, 1px bottom border; page title H3 left; notification bell with Badge and avatar Dropdown right. **Public header**: 64h, logo Fraunces 600 22, nav Inter 500 14 (active green + 2px underline), Login small primary button.
- **Messages**: `message` toast top center 24px from top, white, 1px #E7E5DF, radius 8, shadow 0 6px 16px rgba(20,49,44,0.12), padding 10 16, icon 18, Inter 14; 3s (errors 5s). `notification` top right 320 wide, title Inter 600 14, description 13 muted, 6s. Alert (inline): semantic bg, 1px border at 30%, radius 8, padding 12 16. Use toast for short results, Alert for persistent problems.
- **Modal**: width 520 (forms) / 720 (gallery), radius 12, padding 24, elevation-2, overlay rgba(20,49,44,0.45), title H3, footer Cancel (secondary) then primary, right aligned gap 12. Mobile: width 100% - 32. Focus trapped, returns to trigger. **Drawer**: right, 420 (480 at xl), padding 24, header 64. **Popconfirm** for destructive row actions (danger primary + secondary "Keep").
- **Steps**: Room, Details, Payment. Current: 28px green circle white number. Finished: green circle + check. Waiting: 1px #D6D3CB circle grey number. Connector 1px #D6D3CB (green when finished). Label Inter 500 14.
- **Skeleton** (lists, cards, rows): base #EFEDE6, highlight #F7F6F2, 1.2s linear shimmer (off under reduced motion), same shape as final content. **Spinner** only inside buttons or tiny inline waits.
- **Empty / Result**: icon 48 muted, title Inter 600 18, description 14 muted, optional primary action, centered. 404 "Page not found", 403 "You do not have access", 500 "Something went wrong", each with "Back to home". Error boundary replaces only the broken section, with "Try again".
- **Chat**: own message bg #1F4D45 text #FFF, radius 12 with 4px bottom-right, max width 70%, padding 8 12. Other: bg #FFF, 1px #E7E5DF, text #1F2933, radius 12 with 4px bottom-left. Same sender within 2 min: 4px gap; new group 16px; timestamp Inter 12 muted after a group. System pill: bg #EFEDE6, full radius, Inter 12 muted. Typing: three 5px grey dots in a small white bubble. Input bar 56h, grows to 4 lines, Send = primary icon button 40; Enter sends, Shift+Enter newline. Virtualized thread, auto-scroll, "New messages" pill when scrolled up. Conversation item 72h: avatar 40, name Inter 600 14, preview 13 muted truncated, time 12, unread badge green with white number.
- **Call popup**: 320 wide, fixed bottom-right (bottom sheet on mobile), radius 12, elevation-2. Incoming: Accept (primary) + Decline (danger outline). Connected: timer, Mute (icon secondary), End (danger round icon). Ended: system pill "Call ended 02:14".
- **Images**: cover 4:3 for cards, 16:10 for detail gallery, 16:9 or 21:9 hero. `next/image` with fixed dimensions and blur placeholder. Overlay on photos = flat 35% #14312C only. Missing image = neutral #EFEDE6 block with a muted icon.

## 8. Pages (routes in DECISIONS.md)
1. **Home / Rooms list `/`**: header; hero 360h (280 mobile) photo + flat 35% green overlay, headline Display white; search card (white, radius 12, padding 16, RangePicker + guests + type + large primary "Search") overlapping hero by 40; filter chips row (All, Single, Double, Suite, Family, plus price chips); room card grid (12 per page, server pagination from API); pagination centered; skeleton cards while loading.
2. **Room detail `/rooms/[id]`**: 8/4 columns. Left: gallery (main 16:10 radius 12 + 4 thumbnails 4:3, click opens 720 Modal lightbox), title H1, meta row, facility Tags with icons, description Body large (65ch, "Read more" after 6 lines). Right: sticky booking card (top 88): price, RangePicker, guests stepper, availability Tag, large primary "Book now" full width. Mobile: fixed bottom bar 72h with price + button.
3. **Login / Register**: split layout; left panel (hidden <768) solid #14312C with photo and H1 white text; right form column max-width 400, padding 48 (24 mobile), large inputs and large primary full-width button, "Create an account" text button, wrong password -> inline Alert "Email or password is incorrect."
4. **Booking `/book/[roomId]`**: Steps centered (max 640, 32 below). Form card 8/12 (padding 24), summary card 4/12 sticky (16:10 thumbnail, rows Body 14/22, Total Price font). Back secondary left, Continue/Pay now primary right. Success = Result with reference + "View booking". Overlap (409) = Alert "This room was just booked for these dates. Choose other dates." with link to the room.
5. **My bookings `/my-bookings`**: H1 + subtitle; Tabs Upcoming/Past/Cancelled (48h, green underline); Table (Booking, Room, Dates sortable, Status Tag, Total right, Actions); "View" text button opens Drawer 420; "Cancel" danger text button with Popconfirm; mobile cards; Empty "No upcoming bookings" + "Browse rooms".
6. **Chat `/chat` and `/dashboard/chat`**: guest = single thread; staff = list (320) + thread; thread header 64 with name, online dot, "Call" secondary button; bubbles and input bar as in Components.
7. **Dashboard `/dashboard`**: sidebar + header; 4 stat cards (Revenue, Bookings, Occupancy, Check-ins today; 4 per row xl, 2 md, 1 xs); Sales bar chart (single color #1F4D45, gridlines #E7E5DF, white tooltip, dynamic import); Recent bookings compact table (row 44, 5 rows, "View all").
8. **Rooms manage `/dashboard/rooms`**: title H3 + primary "Add room"; filter bar (search 280, Type select, Status select, gap 12, filters in URL); Table (thumbnail 56x40 radius 6, Room, Type, Price right, Status Tag, Edit text button, Delete danger text button + Popconfirm; row 64); Modal 520 form (number, type, price, capacity, facilities, description, image upload area); footer Cancel + Save.
9. **Bookings manage `/dashboard/bookings`**, **Staff `/dashboard/staff`**, **Reports `/dashboard/reports`** reuse the pattern of 8 (title + action, filter bar, table, Drawer 420 for details, Modal for forms). Bookings filters: status chips, date range, search by reference; row actions: View, Check in, Check out, Cancel (Popconfirm). Reports: date range + sales and occupancy charts + table.
States on every page: Loading = Skeleton matching the layout. Empty = Empty + next action. Request error = Alert or Result with "Try again"; failed actions = toast. Crash = error boundary. 404/403 = Result pages.

## 9. Responsive
Mobile first. Test at 360, 768, 1024, 1440. Page body never scrolls sideways (wide tables scroll inside their own container). Header: logo + menu icon (nav in Drawer) below 768. Detail page: booking bar fixed at bottom below 992. Modals: full width - 32 on mobile. Forms single column (two columns only for short fields at >= 992). Chat: list and thread as separate screens below 768.

## 10. Accessibility
Contrast >= 4.5 body, >= 3 large text/graphics. Same visible focus outline everywhere. Touch targets >= 44. Every input has a visible label. Icon-only buttons have aria-label + Tooltip. Status never color only. Full keyboard use (Tab, Enter, Space, Esc), modals trap focus. Meaningful alt text on room photos. aria-live="polite" for toasts and new chat messages. Field errors use aria-describedby. Respect prefers-reduced-motion.

## 11. Copy
Primary actions: "Book now", "Search", "Save", "Pay now". Empty: "No bookings yet. Browse rooms to make your first booking." Error: "Could not save the room. Check your connection and try again." Success: "Booking confirmed. A confirmation was sent to your email." Destructive: "Delete this room? This cannot be undone." Overlap: "This room was just booked for these dates. Choose other dates." Never show raw error codes or "Oops".

## 12. Tokens as code
**tailwind.config.js** (Tailwind v3):
```js
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  corePlugins: { preflight: false },
  theme: {
    screens: { sm: "576px", md: "768px", lg: "992px", xl: "1200px", "2xl": "1600px" },
    extend: {
      colors: {
        green: { 50: "#F0F5F4", 100: "#E6EEEC", 200: "#C5D8D3", 300: "#8FB0A8", 500: "#2A6358",
                 600: "#1F4D45", 700: "#163A34", 800: "#14312C", 900: "#0D211E" },
        brass: { 100: "#F6EBD6", 300: "#E3CFA4", 500: "#B8893B", 700: "#8A6428" },
        canvas: "#F7F6F2", line: "#E7E5DF", "line-strong": "#D6D3CB", ink: "#1F2933", muted: "#5B6472",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      borderRadius: { md: "8px", lg: "12px" },
      boxShadow: { e1: "0 4px 12px rgba(20,49,44,0.08)", e2: "0 12px 32px rgba(20,49,44,0.16)" },
      maxWidth: { container: "1200px" },
    },
  },
};
```
**Ant Design theme** (v5):
```tsx
const theme = {
  token: {
    colorPrimary: "#1F4D45", colorPrimaryHover: "#2A6358", colorPrimaryActive: "#163A34",
    colorInfo: "#2B5C8A", colorSuccess: "#2E7D4F", colorWarning: "#B7791F", colorError: "#B42318",
    colorTextBase: "#1F2933", colorTextSecondary: "#5B6472", colorTextPlaceholder: "#6B7280",
    colorBgLayout: "#F7F6F2", colorBgContainer: "#FFFFFF",
    colorBorder: "#D6D3CB", colorBorderSecondary: "#E7E5DF",
    borderRadius: 8, borderRadiusLG: 12, borderRadiusSM: 4,
    fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 14,
    controlHeight: 40, controlHeightSM: 32, controlHeightLG: 48,
    boxShadow: "0 4px 12px rgba(20,49,44,0.08)", boxShadowSecondary: "0 12px 32px rgba(20,49,44,0.16)",
    motionDurationFast: "0.12s", motionDurationMid: "0.2s", motionDurationSlow: "0.24s",
  },
  components: {
    Button: { fontWeight: 500, primaryShadow: "none", defaultShadow: "none", dangerShadow: "none" },
    Layout: { siderBg: "#14312C", headerBg: "#FFFFFF", bodyBg: "#F7F6F2", headerHeight: 64 },
    Menu: {
      darkItemBg: "#14312C", darkItemColor: "#B7C7C2", darkItemHoverBg: "rgba(255,255,255,0.06)",
      darkItemHoverColor: "#FFFFFF", darkItemSelectedBg: "#1F4D45", darkItemSelectedColor: "#FFFFFF",
      itemHeight: 44, itemBorderRadius: 8,
    },
    Table: { headerBg: "#F7F6F2", headerColor: "#1F2933", rowHoverBg: "#F7F6F2",
             rowSelectedBg: "#E6EEEC", rowSelectedHoverBg: "#DCE8E5", borderColor: "#E7E5DF" },
    Modal: { borderRadiusLG: 12 }, Card: { borderRadiusLG: 12 },
  },
};
```
**globals.css**:
```css
:focus-visible { outline: 2px solid #1F4D45; outline-offset: 2px; }
body { background: #F7F6F2; color: #1F2933; font-family: var(--font-inter), system-ui, sans-serif; }
h1, h2, h3 { font-family: var(--font-fraunces), Georgia, serif; }
.tabular { font-variant-numeric: tabular-nums; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```
