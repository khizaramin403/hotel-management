import { Suspense } from "react";
import {
  HeroSearchCard,
  HeroSearchCardFallback,
  HomeHero,
  HomeRoomsSection,
} from "@/features/rooms";

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <div className="relative z-10 mx-auto -mt-10 max-w-container px-4 lg:px-6">
        <Suspense fallback={<HeroSearchCardFallback />}>
          <HeroSearchCard />
        </Suspense>
      </div>
      <section className="mx-auto max-w-container px-4 py-8 lg:px-6 lg:py-12">
        <h2 className="m-0 mb-6 font-serif text-[24px] font-semibold leading-[32px] text-ink md:text-[28px] md:leading-[36px]">
          Available rooms
        </h2>
        <HomeRoomsSection />
      </section>
    </>
  );
}
