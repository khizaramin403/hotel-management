"use client";

import type { ReactNode } from "react";
import { CheckOutlined } from "@ant-design/icons";

export interface ChipProps {
  label?: string;
  children?: ReactNode;
  selected: boolean;
  onToggle: (nextSelected: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Chip({
  label,
  children,
  selected,
  onToggle,
  disabled = false,
  className = "",
}: ChipProps) {
  const stateClasses = selected
    ? "bg-green-100 border-green-600 text-green-600 enabled:hover:bg-green-150"
    : "bg-neutral-0 border-line-strong text-ink enabled:hover:bg-green-50 enabled:hover:border-green-600 enabled:hover:text-green-600";

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onToggle(!selected)}
      className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border px-[14px] font-sans text-[14px] font-medium leading-[20px] transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:border-line disabled:bg-canvas disabled:text-neutral-400 lg:h-9 lg:min-h-0 ${stateClasses} ${className}`.trim()}
    >
      {selected ? <CheckOutlined className="text-[16px] leading-none" aria-hidden="true" /> : null}
      <span>{children ?? label}</span>
    </button>
  );
}
