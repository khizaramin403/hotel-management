"use client";

import { Tag } from "antd";
import { getStatusTagStyle, type TagStatus } from "./statusTagMap";

export interface StatusTagProps {
  status: TagStatus;
  kind?: "booking" | "payment" | "room";
  className?: string;
}

export function StatusTag({ status, kind, className = "" }: StatusTagProps) {
  const style = getStatusTagStyle(status, kind);

  return (
    <Tag
      bordered={false}
      className={`m-0 inline-flex h-6 items-center gap-1 rounded-sm border-0 px-2 font-sans text-[12px] font-medium leading-[18px] ${style.bgClass} ${style.textClass} ${className}`.trim()}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${style.dotClass}`}
      />
      <span>{style.label}</span>
    </Tag>
  );
}
