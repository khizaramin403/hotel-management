import { PageHeader } from "@/components/ui";

export default function HomePage() {
  return (
    <section className="mx-auto max-w-container px-4 py-8 md:px-6">
      <PageHeader title="Available rooms" variant="h1" />
      <p className="mt-4 font-sans text-[14px] leading-[22px] text-muted">
        Coming in the next steps.
      </p>
    </section>
  );
}
