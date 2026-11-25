"use client";

import { useRouter } from "next/navigation";
import { Button } from "antd";
import { ErrorState } from "@/components/ui";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-canvas px-4 py-12">
      <ErrorState
        status="404"
        title="Page not found"
        description="The page you are looking for does not exist or may have moved."
        action={
          <Button type="primary" onClick={() => router.push("/")}>
            Back to home
          </Button>
        }
      />
    </div>
  );
}
