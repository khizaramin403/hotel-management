import { RoomImage } from "@/components/ui";

export function HomeHero() {
  return (
    <section className="relative h-[280px] w-full overflow-hidden bg-green-800 md:h-[360px]">
      <RoomImage
        src="/images/hero.webp"
        alt="Grand Hotel exterior and rooms"
        width={1600}
        height={900}
        sizes="100vw"
        priority
        className="absolute inset-0 !h-full !w-full"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-green-800/35"
      />
      <div className="relative z-10 mx-auto flex h-full max-w-container flex-col justify-center px-4 pb-10 lg:px-6">
        <h1 className="m-0 font-serif text-[36px] font-semibold leading-[44px] tracking-[-0.02em] text-neutral-0 md:text-[48px] md:leading-[56px]">
          Find your room
        </h1>
        <p className="mt-2 mb-0 max-w-[65ch] font-sans text-[16px] leading-[26px] text-neutral-0">
          Browse available rooms and check dates for your stay.
        </p>
      </div>
    </section>
  );
}
