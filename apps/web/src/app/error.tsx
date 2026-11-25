"use client";

import { useRouter } from "next/navigation";
import { Button, Result } from "antd";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-canvas px-4 py-12">
      <Result
        status="500"
        title="Something went wrong"
        subTitle="An unexpected error occurred while loading this page."
        extra={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button type="primary" onClick={reset}>
              Try again
            </Button>
            <Button onClick={() => router.push("/")}>Back to home</Button>
          </div>
        }
      />
    </div>
  );
}
