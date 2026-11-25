"use client";

import { useRouter } from "next/navigation";
import { Button } from "antd";
import { ErrorState } from "@/components/ui";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-canvas px-4 py-12">
      <ErrorState
        status="500"
        title="Something went wrong"
        description="An unexpected error occurred while loading this page."
        onRetry={reset}
        action={<Button onClick={() => router.push("/")}>Back to home</Button>}
      />
    </div>
  );
}
