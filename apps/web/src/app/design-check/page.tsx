import { AntdDesignCheck } from "./AntdDesignCheck";
import { UiPrimitivesCheck } from "./UiPrimitivesCheck";

type ColorToken = {
  name: string;
  hex: string;
  swatchClass: string;
  note: string;
};

type ColorGroup = {
  title: string;
  items: readonly ColorToken[];
};

const COLOR_GROUPS: readonly ColorGroup[] = [
  {
    title: "Brand: green",
    items: [
      {
        name: "green-50",
        hex: "#F0F5F4",
        swatchClass: "bg-green-50",
        note: "Secondary/text hover",
      },
      { name: "green-100", hex: "#E6EEEC", swatchClass: "bg-green-100", note: "Selected chip/row" },
      { name: "green-200", hex: "#C5D8D3", swatchClass: "bg-green-200", note: "Card hover border" },
      {
        name: "green-300",
        hex: "#8FB0A8",
        swatchClass: "bg-green-300",
        note: "Input hover border",
      },
      { name: "green-500", hex: "#2A6358", swatchClass: "bg-green-500", note: "Primary hover" },
      { name: "green-600", hex: "#1F4D45", swatchClass: "bg-green-600", note: "Primary" },
      { name: "green-700", hex: "#163A34", swatchClass: "bg-green-700", note: "Primary pressed" },
      {
        name: "green-800",
        hex: "#14312C",
        swatchClass: "bg-green-800",
        note: "Sidebar background",
      },
      { name: "green-900", hex: "#0D211E", swatchClass: "bg-green-900", note: "Deepest dark" },
    ],
  },
  {
    title: "Accent: brass",
    items: [
      { name: "brass-100", hex: "#F6EBD6", swatchClass: "bg-brass-100", note: "Notice background" },
      { name: "brass-300", hex: "#E3CFA4", swatchClass: "bg-brass-300", note: "Decorative line" },
      { name: "brass-500", hex: "#B8893B", swatchClass: "bg-brass-500", note: "Sidebar indicator" },
      {
        name: "brass-700",
        hex: "#8A6428",
        swatchClass: "bg-brass-700",
        note: "Brass text on light",
      },
    ],
  },
  {
    title: "Neutrals (warm)",
    items: [
      {
        name: "neutral-0 / white",
        hex: "#FFFFFF",
        swatchClass: "bg-neutral-0",
        note: "Cards, inputs",
      },
      {
        name: "neutral-50 / canvas",
        hex: "#F7F6F2",
        swatchClass: "bg-canvas",
        note: "Page background",
      },
      { name: "neutral-100", hex: "#EFEDE6", swatchClass: "bg-neutral-100", note: "Skeleton base" },
      { name: "neutral-200 / line", hex: "#E7E5DF", swatchClass: "bg-line", note: "Borders" },
      {
        name: "neutral-300 / line-strong",
        hex: "#D6D3CB",
        swatchClass: "bg-line-strong",
        note: "Input borders",
      },
      { name: "neutral-400", hex: "#9CA3AF", swatchClass: "bg-neutral-400", note: "Disabled text" },
      { name: "placeholder", hex: "#6B7280", swatchClass: "bg-placeholder", note: "Placeholder" },
      { name: "neutral-600 / muted", hex: "#5B6472", swatchClass: "bg-muted", note: "Muted text" },
      { name: "neutral-900 / ink", hex: "#1F2933", swatchClass: "bg-ink", note: "Main text" },
    ],
  },
  {
    title: "Semantic",
    items: [
      { name: "success", hex: "#2E7D4F", swatchClass: "bg-success", note: "Success icon" },
      { name: "success-bg", hex: "#E7F4EC", swatchClass: "bg-success-bg", note: "Success tag bg" },
      {
        name: "success-text",
        hex: "#1F6B42",
        swatchClass: "bg-success-text",
        note: "Success tag text",
      },
      { name: "warning", hex: "#B7791F", swatchClass: "bg-warning", note: "Warning icon" },
      { name: "warning-bg", hex: "#FDF3DC", swatchClass: "bg-warning-bg", note: "Pending tag bg" },
      {
        name: "warning-text",
        hex: "#8A5A00",
        swatchClass: "bg-warning-text",
        note: "Pending tag text",
      },
      { name: "error", hex: "#B42318", swatchClass: "bg-error", note: "Error / danger" },
      { name: "error-bg", hex: "#FDECEA", swatchClass: "bg-error-bg", note: "Error tag bg" },
      {
        name: "error-hover",
        hex: "#912018",
        swatchClass: "bg-error-hover",
        note: "Danger hover",
      },
      {
        name: "error-pressed",
        hex: "#7A1A12",
        swatchClass: "bg-error-pressed",
        note: "Danger pressed",
      },
      { name: "info", hex: "#2B5C8A", swatchClass: "bg-info", note: "Info icon/text" },
      { name: "info-bg", hex: "#E8F0FA", swatchClass: "bg-info-bg", note: "Info tag bg" },
    ],
  },
];

type TypeSpecimen = {
  role: string;
  spec: string;
  sample: string;
  className: string;
};

const TYPE_SCALE: readonly TypeSpecimen[] = [
  {
    role: "Display",
    spec: "Fraunces 600, 48/56 (36/44 mobile), -0.02em",
    sample: "Find your room",
    className:
      "font-serif font-semibold text-[36px] leading-[44px] md:text-[48px] md:leading-[56px] tracking-[-0.02em] text-ink",
  },
  {
    role: "H1",
    spec: "Fraunces 600, 36/44 (28/36 mobile), -0.01em",
    sample: "Deluxe Room",
    className:
      "font-serif font-semibold text-[28px] leading-[36px] md:text-[36px] md:leading-[44px] tracking-[-0.01em] text-ink",
  },
  {
    role: "H2",
    spec: "Fraunces 600, 28/36 (24/32 mobile)",
    sample: "Available rooms",
    className:
      "font-serif font-semibold text-[24px] leading-[32px] md:text-[28px] md:leading-[36px] text-ink",
  },
  {
    role: "H3",
    spec: "Fraunces 500, 22/30 (20/28 mobile)",
    sample: "Guest details",
    className:
      "font-serif font-medium text-[20px] leading-[28px] md:text-[22px] md:leading-[30px] text-ink",
  },
  {
    role: "Price",
    spec: "Fraunces 600, 24/32 (22/30 mobile), tabular",
    sample: "PKR 15,000",
    className:
      "font-serif font-semibold text-[22px] leading-[30px] md:text-[24px] md:leading-[32px] tabular text-ink",
  },
  {
    role: "H4 (card title)",
    spec: "Inter 600, 18/26",
    sample: "Deluxe Garden View",
    className: "font-sans font-semibold text-[18px] leading-[26px] text-ink",
  },
  {
    role: "Body large",
    spec: "Inter 400, 16/26",
    sample: "Quiet corner suite overlooking the courtyard garden with natural light.",
    className: "font-sans font-normal text-[16px] leading-[26px] max-w-[65ch] text-ink",
  },
  {
    role: "Body",
    spec: "Inter 400, 14/22",
    sample: "Check-in starts at 2:00 PM. Free cancellation up to 24 hours before arrival.",
    className: "font-sans font-normal text-[14px] leading-[22px] max-w-[65ch] text-ink",
  },
  {
    role: "Label",
    spec: "Inter 500, 14/20",
    sample: "Check-in date",
    className: "font-sans font-medium text-[14px] leading-[20px] text-ink",
  },
  {
    role: "Button",
    spec: "Inter 500, 14/20",
    sample: "Book now",
    className: "font-sans font-medium text-[14px] leading-[20px] text-ink",
  },
  {
    role: "Table header",
    spec: "Inter 600, 13/20, 0.02em",
    sample: "Booking reference",
    className: "font-sans font-semibold text-[13px] leading-[20px] tracking-[0.02em] text-ink",
  },
  {
    role: "Small",
    spec: "Inter 400, 13/20",
    sample: "2 guests - 28 m2",
    className: "font-sans font-normal text-[13px] leading-[20px] text-muted",
  },
  {
    role: "Caption",
    spec: "Inter 400/500, 12/18",
    sample: "Today, 10:42",
    className: "font-sans font-normal text-[12px] leading-[18px] text-muted",
  },
];

type SpacingSample = {
  token: string;
  px: string;
  barClass: string;
  use: string;
};

const SPACING_SCALE: readonly SpacingSample[] = [
  { token: "space-1", px: "4px", barClass: "w-1", use: "Icon to text gap in tags" },
  { token: "space-2", px: "8px", barClass: "w-2", use: "Tight gaps, chip gap" },
  { token: "space-3", px: "12px", barClass: "w-3", use: "Button group gap, input padding" },
  { token: "space-4", px: "16px", barClass: "w-4", use: "Card padding, field gap" },
  { token: "space-5", px: "20px", barClass: "w-5", use: "Medium component spacing" },
  { token: "space-6", px: "24px", barClass: "w-6", use: "Desktop page padding, gutter" },
  { token: "space-8", px: "32px", barClass: "w-8", use: "Between sections inside a page" },
  { token: "space-12", px: "48px", barClass: "w-12", use: "Between major page sections" },
  { token: "space-16", px: "64px", barClass: "w-16", use: "Hero padding" },
  { token: "space-24", px: "96px", barClass: "w-24", use: "Large section spacing" },
];

type RadiusSample = {
  token: string;
  value: string;
  className: string;
  use: string;
};

const RADIUS_SAMPLES: readonly RadiusSample[] = [
  { token: "rounded-sm", value: "4px", className: "rounded-sm", use: "Tags, small elements" },
  { token: "rounded-md", value: "8px", className: "rounded-md", use: "Buttons, inputs, selects" },
  { token: "rounded-lg", value: "12px", className: "rounded-lg", use: "Cards, modals, drawers" },
  { token: "rounded-full", value: "9999px", className: "rounded-full", use: "Avatars, chips" },
];

type ShadowSample = {
  token: string;
  value: string;
  className: string;
  use: string;
};

const SHADOW_SAMPLES: readonly ShadowSample[] = [
  {
    token: "elevation-0",
    value: "none (1px #E7E5DF border)",
    className: "border border-line bg-neutral-0",
    use: "Cards, tables, panels (default)",
  },
  {
    token: "shadow-e1",
    value: "0 4px 12px rgba(20,49,44,0.08)",
    className: "border border-line bg-neutral-0 shadow-e1",
    use: "Dropdowns, popovers, card hover",
  },
  {
    token: "shadow-e2",
    value: "0 12px 32px rgba(20,49,44,0.16)",
    className: "border border-line bg-neutral-0 shadow-e2",
    use: "Modals, drawers",
  },
  {
    token: "focus",
    value: "2px solid #1F4D45, 2px offset",
    className:
      "border border-line-strong bg-neutral-0 outline outline-2 outline-offset-2 outline-green-600",
    use: "Keyboard focus ring",
  },
];

export default function DesignCheckPage() {
  return (
    <main className="mx-auto max-w-container px-4 py-8 lg:px-6 lg:py-12">
      <header className="mb-12 border-b border-line pb-6">
        <h1 className="m-0 font-serif text-[28px] font-semibold leading-[36px] tracking-[-0.01em] text-ink md:text-[36px] md:leading-[44px]">
          Design token check
        </h1>
        <p className="mt-2 font-sans text-[16px] leading-[26px] text-muted">
          Temporary verification page for color tokens, typography scale, spacing, radii, and
          shadows.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="mb-6 font-serif text-[24px] font-semibold leading-[32px] text-ink md:text-[28px] md:leading-[36px]">
          Color tokens
        </h2>
        <div className="space-y-8">
          {COLOR_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="mb-4 font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]">
                {group.title}
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {group.items.map((item) => (
                  <div key={item.name} className="rounded-lg border border-line bg-neutral-0 p-4">
                    <div
                      className={`h-14 w-full rounded-md border border-line ${item.swatchClass}`}
                    />
                    <div className="mt-3 font-sans text-[14px] font-semibold leading-[20px] text-ink">
                      {item.name}
                    </div>
                    <div className="font-sans text-[13px] leading-[20px] tabular text-muted">
                      {item.hex}
                    </div>
                    <div className="font-sans text-[12px] leading-[18px] text-muted">
                      {item.note}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-6 font-serif text-[24px] font-semibold leading-[32px] text-ink md:text-[28px] md:leading-[36px]">
          Type scale
        </h2>
        <div className="divide-y divide-line rounded-lg border border-line bg-neutral-0">
          {TYPE_SCALE.map((item) => (
            <div
              key={item.role}
              className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-12 lg:items-baseline"
            >
              <div className="lg:col-span-4">
                <div className="font-sans text-[14px] font-semibold leading-[20px] text-ink">
                  {item.role}
                </div>
                <div className="font-sans text-[13px] leading-[20px] text-muted">{item.spec}</div>
              </div>
              <div className="lg:col-span-8">
                <div className={item.className}>{item.sample}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-6 font-serif text-[24px] font-semibold leading-[32px] text-ink md:text-[28px] md:leading-[36px]">
          Spacing scale
        </h2>
        <div className="space-y-3 rounded-lg border border-line bg-neutral-0 p-6">
          {SPACING_SCALE.map((item) => (
            <div key={item.token} className="grid grid-cols-1 items-center gap-3 sm:grid-cols-12">
              <div className="font-sans text-[14px] font-medium leading-[20px] text-ink sm:col-span-2">
                {item.token} ({item.px})
              </div>
              <div className="flex items-center sm:col-span-4">
                <div className={`h-4 rounded-sm bg-green-600 ${item.barClass}`} />
              </div>
              <div className="font-sans text-[13px] leading-[20px] text-muted sm:col-span-6">
                {item.use}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-6 font-serif text-[24px] font-semibold leading-[32px] text-ink md:text-[28px] md:leading-[36px]">
          Radius samples
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {RADIUS_SAMPLES.map((item) => (
            <div key={item.token} className="rounded-lg border border-line bg-neutral-0 p-6">
              <div
                className={`h-20 w-20 border border-line-strong bg-green-50 ${item.className}`}
              />
              <div className="mt-4 font-sans text-[14px] font-semibold leading-[20px] text-ink">
                {item.token} ({item.value})
              </div>
              <div className="font-sans text-[13px] leading-[20px] text-muted">{item.use}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-6 font-serif text-[24px] font-semibold leading-[32px] text-ink md:text-[28px] md:leading-[36px]">
          Borders, shadows, and focus
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SHADOW_SAMPLES.map((item) => (
            <div key={item.token} className={`rounded-lg p-6 ${item.className}`}>
              <div className="font-sans text-[14px] font-semibold leading-[20px] text-ink">
                {item.token}
              </div>
              <div className="mt-1 font-sans text-[12px] leading-[18px] text-muted">
                {item.value}
              </div>
              <div className="mt-2 font-sans text-[13px] leading-[20px] text-ink">{item.use}</div>
            </div>
          ))}
        </div>
      </section>

      <AntdDesignCheck />
      <UiPrimitivesCheck />
    </main>
  );
}
