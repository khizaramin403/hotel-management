"use client";

import { Skeleton } from "antd";

export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-container px-4 py-8 md:px-6"
      role="status"
      aria-busy="true"
      aria-label="Loading page"
    >
      <Skeleton active title={{ width: "30%" }} paragraph={{ rows: 6 }} />
    </div>
  );
}
