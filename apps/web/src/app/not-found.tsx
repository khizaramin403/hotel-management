"use client";

import { useRouter } from "next/navigation";
import { Button, Result } from "antd";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-canvas px-4 py-12">
      <Result
        status="404"
        title="Page not found"
        subTitle="The page you are looking for does not exist or may have moved."
        extra={
          <Button type="primary" onClick={() => router.push("/")}>
            Back to home
          </Button>
        }
      />
    </div>
  );
}
