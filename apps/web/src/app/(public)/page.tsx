import { PageHeader } from "@/components/ui";
import { HomeRoomsSection } from "@/features/rooms";

export default function HomePage() {
  return (
    <section className="mx-auto max-w-container px-4 py-8 lg:px-6">
      <PageHeader title="Available rooms" variant="h1" className="mb-6" />
      <HomeRoomsSection />
    </section>
  );
}
